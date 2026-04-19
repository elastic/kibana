/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { parentPort, workerData } = require('worker_threads');
const { readFileSync } = require('fs');
const path = require('path');
const ignore = require('ignore');

// Max file size to process (2MB) to avoid memory spikes with minified files
const MAX_FILE_SIZE = 2 * 1024 * 1024;

// Patterns to identify npm packages (not relative imports or @kbn/* packages)
const NPM_PACKAGE_PATTERN = /^(?!\.|@kbn\/)[@a-zA-Z][\w\-./]*$/;

// Single combined alternation across all 4 import syntaxes. Each alternative
// captures the specifier into its own group; the matched group index identifies
// which syntax fired. One regex pass is materially cheaper than four full-content
// scans on large source files.
//   group 1: `import [type] [bindings from] '<spec>'`
//   group 2: `import('<spec>')`
//   group 3: `require('<spec>')`
//   group 4: `export [bindings from] '<spec>'`
const COMBINED_IMPORT_REGEX =
  /import\s+(?:type\s+)?(?:[\w*{}\s,]+\s+from\s+)?['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)|require\s*\(\s*['"]([^'"]+)['"]\s*\)|export\s+(?:.*?\s+from\s+)?['"]([^'"]+)['"]/g;

/**
 * Parse a CODEOWNERS file's contents into a list of `{ pattern, teams, matcher }`
 * entries, ordered so that the FIRST matching entry wins (i.e. lower-in-file
 * entries take precedence — matches GitHub's CODEOWNERS semantics).
 *
 * Filters out comments, empty lines, the `@kibanamachine` bot, and any entry
 * with no team owners.
 */
function parseCodeOwners(content) {
  const lines = content.split(/\r?\n/);
  const entries = [];

  for (const line of lines) {
    if (!line || line.startsWith('#') || line.includes('@kibanamachine')) continue;

    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    const [pattern, ...teams] = trimmedLine.replace(/#.+$/, '').split(/\s+/);
    const pathPattern = pattern.replace(/\/$/, '');
    const validTeams = teams.map((t) => t.replace('@', '')).filter((t) => t.length > 0);

    if (validTeams.length > 0) {
      entries.push({
        pattern: pathPattern,
        teams: validTeams,
        matcher: ignore().add(pathPattern),
      });
    }
  }

  return entries.reverse();
}

/**
 * Return the team owners for the given absolute file path, looking up against
 * the supplied parsed CODEOWNERS entries (already reversed so first match wins).
 */
function getTeamsForPath(filePath, codeOwnersEntries, repoRoot) {
  if (!codeOwnersEntries || !repoRoot) return [];

  const relativePath = path.relative(repoRoot, filePath);
  const entry = codeOwnersEntries.find((p) => p.matcher.test(relativePath).ignored);
  return entry ? entry.teams : [];
}

/**
 * Extract npm-package import specifiers from a JS/TS source file's content.
 * Covers static `import ... from 'x'`, dynamic `import('x')`, `require('x')`,
 * and `export ... from 'x'`. Filters out relative paths and `@kbn/*`.
 *
 * Implementation note: a single combined regex (`COMBINED_IMPORT_REGEX`) does
 * one left-to-right pass instead of four full-content scans.
 */
function extractImportsFromContent(content) {
  const imports = new Set();
  // RegExp objects with the `g` flag carry mutable `lastIndex` state. The
  // regex is module-level (shared across calls) so reset before each pass to
  // make the function safely reentrant.
  COMBINED_IMPORT_REGEX.lastIndex = 0;
  let match;
  while ((match = COMBINED_IMPORT_REGEX.exec(content)) !== null) {
    const spec = match[1] || match[2] || match[3] || match[4];
    if (spec) addPackageIfValid(spec, imports);
  }

  return Array.from(imports);
}

/**
 * If `importPath` looks like an npm package specifier (not relative, not @kbn/*),
 * extract the package name and add it to the supplied set. Scoped packages keep
 * the first two segments (`@scope/name`); unscoped keep the first.
 */
function addPackageIfValid(importPath, imports) {
  if (NPM_PACKAGE_PATTERN.test(importPath)) {
    const packageName = importPath
      .split('/')
      .slice(0, importPath.startsWith('@') ? 2 : 1)
      .join('/');
    imports.add(packageName);
  }
}

// ----- Module-level state for the runtime worker thread -----
// `parentPort` and `workerData` are only set when this file is loaded by
// `new Worker(...)`. When loaded from a unit test, both are null/undefined and
// the side-effecting blocks below are skipped — only the exports are reused.
let codeOwnersEntries = null;
let REPO_ROOT = null;

if (workerData) {
  REPO_ROOT = workerData.repoRoot;
  try {
    const content = readFileSync(workerData.codeOwnersPath, 'utf8');
    codeOwnersEntries = parseCodeOwners(content);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Failed to initialize CODEOWNERS in worker:', e);
    codeOwnersEntries = [];
  }
}

/**
 * Process a single file, returning the per-item result shape that the worker
 * sends back to the orchestrator. Pure aside from the `readFileSync` syscall —
 * `codeOwnersEntries` and `repoRoot` are passed in (not closed over), so this
 * function is fully unit-testable without a real worker thread.
 *
 * Skip semantics (returns `{ success: true, skipped: true }`):
 * - file's path has no team owner in CODEOWNERS
 * - file is larger than `MAX_FILE_SIZE` (checked via Buffer length, see note)
 * - file cannot be read (e.g. deleted between discovery and processing)
 *
 * Note on `MAX_FILE_SIZE`: we read the file as a Buffer and check `.length`
 * BEFORE converting to a string. This costs one extra `read` syscall on
 * oversized files vs the prior `statSync`-then-`read` flow, but saves one
 * `stat` syscall on every other file. Net win because oversized files (>2MB)
 * are rare in the grep-pre-filtered set, and `stat` ran on all ~83k files.
 */
function processFile(filePath, relativePath, codeOwnersEntries, repoRoot) {
  try {
    const teams = getTeamsForPath(filePath, codeOwnersEntries, repoRoot);
    if (teams.length === 0) {
      return { relativePath, success: true, skipped: true };
    }

    let buffer;
    try {
      buffer = readFileSync(filePath);
    } catch (e) {
      return { relativePath, success: true, skipped: true };
    }
    if (buffer.length > MAX_FILE_SIZE) {
      return { relativePath, success: true, skipped: true };
    }

    const imports = extractImportsFromContent(buffer.toString('utf8'));
    return { relativePath, success: true, imports, teams };
  } catch (error) {
    return {
      relativePath,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

if (parentPort) {
  // Batched protocol: parent posts `{ files: [{filePath, relativePath}, ...] }`,
  // worker replies once per batch with `{ results: [...] }` containing one
  // entry per input file (in the same order). Per-item errors are reported
  // inline via `success: false`; the worker only throws (and dies) on
  // catastrophic conditions like message-channel failure.
  parentPort.on('message', (data) => {
    const files = data && Array.isArray(data.files) ? data.files : [];
    const results = new Array(files.length);
    for (let i = 0; i < files.length; i++) {
      const { filePath, relativePath } = files[i];
      results[i] = processFile(filePath, relativePath, codeOwnersEntries, REPO_ROOT);
    }
    parentPort.postMessage({ results });
  });
}

module.exports = {
  parseCodeOwners,
  getTeamsForPath,
  extractImportsFromContent,
  addPackageIfValid,
  processFile,
  MAX_FILE_SIZE,
  NPM_PACKAGE_PATTERN,
};
