import { Hono } from "hono";
import { serve } from "@hono/node-server";
import fs from "fs";
import path from "path";
import { ignore } from "./ignore";

const app = new Hono();

const ROOT = process.cwd();

function walk(dir: string) {
  const result: any[] = [];
  for (const name of fs.readdirSync(dir)) {
    // Skip directories in the ignore list
    if (ignore.includes(name)) {
      continue;
    }

    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    result.push({
      name,
      type: stat.isDirectory() ? "dir" : "file",
      path: path.relative(ROOT, full),
      ...(stat.isDirectory() ? { children: walk(full) } : {}),
    });
  }
  return result;
}

// GET /tree → return nested file tree
app.get("/tree", (c) => {
  const tree = walk(ROOT);
  return c.json(tree);
});

// GET /file/:path → return file contents
app.get("/file/:path{.+}", (c) => {
  const relPath = c.req.param("path");

  if (!relPath) {
    return c.text("Not found", 404);
  }

  const fullPath = path.join(ROOT, relPath);

  if (!fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory()) {
    return c.text("Not found", 404);
  }
  const contents = fs.readFileSync(fullPath, "utf-8");
  return c.json({ path: relPath, contents });
});

serve(app, (info) => {
  console.log(`🚀 Agent running at http://localhost:${info.port}`);
});
