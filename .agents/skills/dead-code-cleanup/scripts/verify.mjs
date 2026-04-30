/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Resolve-aware verifier for "is this file imported anywhere?"
 *
 * Walks every .ts/.tsx/.js/.jsx in the repo, finds:
 *   - static imports:    import x from '<spec>'
 *   - dynamic imports:   import('<spec>')
 *   - require:           require('<spec>')
 *   - jest.mock strings: jest.mock('<spec>', ...)
 *   - package-id deep:   import x from '@kbn/<pkg>/<sub>'
 *
 * Resolves each spec Node-style relative to the importing file:
 *   <base>{.ts,.tsx,.js,.jsx} | <base>/index{.ts,.tsx,.js,.jsx}
 *
 * Reports any importer whose resolution matches the candidate file.
 *
 * Usage:
 *   node .agents/skills/dead-code-cleanup/scripts/verify.mjs <candidate-path>
 *
 *   <candidate-path> may be relative to CWD or to repo root, with or without
 *   a leading ./.
 *
 * Exit codes:
 *   0 — DEAD (no importer found)
 *   1 — ALIVE (one or more importers; printed to stdout)
 *   2 — usage / setup error
 */

import { execSync } from 'node:child_process';
import { readFileSync, statSync, existsSync } from 'node:fs';
import { join, resolve, relative, dirname, normalize } from 'node:path';

const args = process.argv.slice(2);
if (args.length !== 1) {
  console.error('Usage: node verify.mjs <candidate-path>');
  process.exit(2);
}

const REPO_ROOT = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
const candidate = resolve(args[0]);
if (!existsSync(candidate)) {
  // The verifier still works when the file is gone (e.g. just-deleted) —
  // use the path as-is, just warn.
  console.error(`note: candidate ${candidate} does not exist on disk; verifying as path string.`);
}

// Build the set of all .ts/.tsx/.js/.jsx files in the repo (excluding node_modules, target, build, and dotfiles)
const allFiles = execSync(
  `git -C "${REPO_ROOT}" ls-files '*.ts' '*.tsx' '*.js' '*.jsx' '*.mjs' '*.cjs'`,
  { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 }
)
  .split('\n')
  .filter(Boolean)
  .filter((f) => !f.startsWith('target/') && !f.includes('/target/') && !f.includes('/build/'))
  .map((f) => join(REPO_ROOT, f));

// Map @kbn/<pkg> → on-disk package directory by walking kibana.jsonc files
const pkgIdToDir = new Map();
{
  const jsoncFiles = execSync(`git -C "${REPO_ROOT}" ls-files '*kibana.jsonc'`, {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  })
    .split('\n')
    .filter(Boolean);
  for (const rel of jsoncFiles) {
    const path = join(REPO_ROOT, rel);
    let raw;
    try {
      raw = readFileSync(path, 'utf8');
    } catch {
      continue;
    }
    // Strip JSONC comments and trailing commas
    const stripped = raw
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/.*$/gm, '$1')
      .replace(/,(\s*[}\]])/g, '$1');
    let parsed;
    try {
      parsed = JSON.parse(stripped);
    } catch {
      continue;
    }
    if (parsed.id) pkgIdToDir.set(parsed.id, dirname(path));
  }
}

// Resolve a Node-style specifier against a base path. Returns absolute resolved
// path or null if nothing on disk matches.
function resolveSpec(spec, fromFile) {
  let base;
  if (spec.startsWith('.')) {
    base = resolve(dirname(fromFile), spec);
  } else if (spec.startsWith('@kbn/')) {
    const m = spec.match(/^(@kbn\/[^/]+)(?:\/(.+))?$/);
    if (!m) return null;
    const dir = pkgIdToDir.get(m[1]);
    if (!dir) return null;
    base = m[2] ? resolve(dir, m[2]) : resolve(dir, 'index');
  } else {
    return null; // bare specifier into node_modules — out of scope
  }
  for (const ext of ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js', '/index.jsx']) {
    const p = base + ext;
    if (!existsSync(p)) continue;
    // The empty-extension branch must only match files; otherwise a bare
    // directory path (e.g. `.../use_discover_url`) wins over its index.ts.
    if (ext === '' && statSync(p).isDirectory()) continue;
    return normalize(p);
  }
  return null;
}

// Regexes — kept loose intentionally; we don't need a full JS parser here.
const STATIC_IMPORT = /(?:from|import)\s+['"]([^'"\n]+)['"]/g;
const DYNAMIC_IMPORT = /import\s*\(\s*['"]([^'"\n]+)['"]\s*\)/g;
const REQUIRE = /require\s*\(\s*['"]([^'"\n]+)['"]\s*\)/g;
const JEST_MOCK = /jest\.mock\s*\(\s*['"]([^'"\n]+)['"]/g;

const importers = new Set();

for (const file of allFiles) {
  if (file === candidate) continue; // skip self
  let src;
  try {
    src = readFileSync(file, 'utf8');
  } catch {
    continue;
  }

  for (const rx of [STATIC_IMPORT, DYNAMIC_IMPORT, REQUIRE, JEST_MOCK]) {
    rx.lastIndex = 0;
    let m;
    while ((m = rx.exec(src)) !== null) {
      const spec = m[1];
      const resolved = resolveSpec(spec, file);
      if (resolved === candidate) {
        importers.add(file);
        break;
      }
    }
  }
}

if (importers.size === 0) {
  console.log(`DEAD: ${relative(REPO_ROOT, candidate)}`);
  process.exit(0);
}

console.log(`ALIVE: ${relative(REPO_ROOT, candidate)}`);
console.log(`Importers (${importers.size}):`);
for (const f of [...importers].sort()) {
  console.log(`  ${relative(REPO_ROOT, f)}`);
}
process.exit(1);
