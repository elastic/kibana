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
const { readFile } = require('fs/promises');
const path = require('path');
const ignore = require('ignore');

// Max file size to process (2MB) to avoid memory spikes with minified files
const MAX_FILE_SIZE = 2 * 1024 * 1024;

// Cap on concurrent in-flight `readFile` calls per worker. Files are mostly
// small (median <50KB) so a high concurrency lets libuv's threadpool pipeline
// reads instead of running them serially. Tuned together with
// UV_THREADPOOL_SIZE=16 set by the orchestrator pre-spawn (see
// `generate_renovate_codeowners.ts`); going much higher than the threadpool
// just queues work in libuv with no extra parallelism.
const READ_CONCURRENCY = 16;

// A pattern goes into the fast trie path iff it is a literal anchored prefix:
// contains a `/`, contains no glob metacharacters, and is not a `!` negation.
// Everything else (extension globs like `*.scss`, `**`, character classes,
// negations) falls through to the much smaller `globEntries` list and is
// matched via the `ignore` library to preserve gitignore-edge-case fidelity.
const GLOB_META_REGEX = /[*?[\\]/;

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
 * Parse a CODEOWNERS file's contents into a list of `{ pattern, teams }`
 * entries, reversed so that the lower-in-file entries appear first — matching
 * GitHub's CODEOWNERS "last matching entry wins" precedence when consumed by
 * `compileLookupIndex` (which scores by line index across the trie + glob
 * pools).
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
      entries.push({ pattern: pathPattern, teams: validTeams });
    }
  }

  return entries.reverse();
}

/**
 * Compile a parsed CODEOWNERS entry list into a fast lookup index.
 *
 * The hot path on a Kibana-sized repo runs ~83k file lookups against ~3k
 * CODEOWNERS entries. A naive `entries.find(...)` driving `ignore`'s
 * gitignore engine per entry per file is O(N×M) and dominates wall time;
 * splitting entries by shape lets ~95% of them resolve in O(path-depth).
 *
 * The compiled index has two structures:
 *
 *  - `trie`: a path-segment trie carrying entries that are literal anchored
 *    prefixes (e.g. `src/foo/bar`). Lookup is O(depth) — at most ~10 hops
 *    per file — and at each visited node we record the highest `lineIndex`
 *    match seen so far. Last-in-file precedence falls out of the line-index
 *    comparison instead of relying on insertion order.
 *
 *  - `globEntries`: entries that need real glob semantics (extension globs,
 *    double-star wildcards, character classes, etc.). Each carries an
 *    `ignore` matcher built lazily here so `parseCodeOwners` can stay free
 *    of any matcher state. Tested linearly, but the candidate pool is ~5%
 *    of total entries.
 *
 * Both pools share a single `lineIndex` space so glob hits and trie hits
 * are directly comparable — a glob entry appearing after a trie entry wins,
 * and vice versa.
 *
 * Negation patterns (`!`-prefixed) are dropped. A single-pattern matcher
 * has nothing to negate, so `!foo` would never resolve to an owner anyway.
 */
function compileLookupIndex(entries) {
  const trie = { children: new Map(), match: null };
  const globEntries = [];

  // `entries` arrives reversed (last-in-file first), so the original line
  // index is `entries.length - 1 - i`. Scoring by line index across BOTH
  // pools lets `getTeamsForPath` compare a trie hit against a glob hit and
  // pick the one that appears later in the source CODEOWNERS file.
  const total = entries.length;
  for (let i = 0; i < total; i++) {
    const entry = entries[i];
    if (!entry || !entry.pattern) continue;
    if (entry.pattern.startsWith('!')) continue;

    const lineIndex = total - 1 - i;
    const isGlob = GLOB_META_REGEX.test(entry.pattern) || !entry.pattern.includes('/');

    if (isGlob) {
      globEntries.push({
        pattern: entry.pattern,
        teams: entry.teams,
        lineIndex,
        matcher: ignore().add(entry.pattern),
      });
      continue;
    }

    const segments = entry.pattern.replace(/^\//, '').split('/');
    let node = trie;
    for (const segment of segments) {
      let child = node.children.get(segment);
      if (!child) {
        child = { children: new Map(), match: null };
        node.children.set(segment, child);
      }
      node = child;
    }
    if (!node.match || node.match.lineIndex < lineIndex) {
      node.match = { teams: entry.teams, lineIndex };
    }
  }

  return { trie, globEntries };
}

/**
 * Walk the trie along `relativePath`'s segments and return the
 * highest-`lineIndex` match found at or above the deepest reachable node.
 *
 * "At or above" because gitignore-style prefix patterns match the exact path
 * AND every descendant: `src/foo` owns `src/foo`, `src/foo/bar.ts`, and
 * `src/foo/sub/baz.ts`. A more-specific pattern (`src/foo/bar`) higher in the
 * file is overridden by `src/foo` only when `src/foo` appears later — which
 * the line-index comparison enforces.
 */
function lookupTrie(trie, relativePath) {
  const segments = relativePath.split('/');
  let node = trie;
  let best = null;
  for (const segment of segments) {
    const child = node.children.get(segment);
    if (!child) break;
    node = child;
    if (node.match && (!best || node.match.lineIndex > best.lineIndex)) {
      best = node.match;
    }
  }
  return best;
}

/**
 * Return the team owners for the given absolute file path against a compiled
 * lookup index from `compileLookupIndex`. Returns `[]` when either argument
 * is missing or no entry matches.
 *
 * Last-in-file precedence is enforced by picking the highest `lineIndex`
 * across the trie hit (if any) and every glob hit.
 */
function getTeamsForPath(filePath, codeOwnersIndex, repoRoot) {
  if (!codeOwnersIndex || !repoRoot) return [];

  const relativePath = path.relative(repoRoot, filePath);

  let best = lookupTrie(codeOwnersIndex.trie, relativePath);
  for (const entry of codeOwnersIndex.globEntries) {
    if (entry.matcher.test(relativePath).ignored) {
      if (!best || entry.lineIndex > best.lineIndex) {
        best = entry;
      }
    }
  }
  return best ? best.teams : [];
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
let codeOwnersIndex = null;
let REPO_ROOT = null;

if (workerData) {
  REPO_ROOT = workerData.repoRoot;
  try {
    const content = readFileSync(workerData.codeOwnersPath, 'utf8');
    codeOwnersIndex = compileLookupIndex(parseCodeOwners(content));
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Failed to initialize CODEOWNERS in worker:', e);
    codeOwnersIndex = compileLookupIndex([]);
  }
}

/**
 * Process a single file and return the per-item result shape that the worker
 * sends back to the orchestrator. Reads via `fs.promises.readFile` so the
 * worker can keep multiple reads in flight on libuv's threadpool while the
 * lookup/regex work stays on the worker thread. Pure aside from the read
 * syscall — `codeOwnersIndex` and `repoRoot` are passed in (not closed over),
 * so the function is fully unit-testable without a real worker thread.
 *
 * Skip semantics (returns `{ success: true, skipped: true }`):
 * - file's path has no team owner in CODEOWNERS
 * - file is larger than `MAX_FILE_SIZE` (checked via Buffer length, see note)
 * - file cannot be read (e.g. deleted between discovery and processing)
 *
 * Note on `MAX_FILE_SIZE`: we read the file as a Buffer and check `.length`
 * BEFORE converting to a string. This costs one extra `read` syscall on
 * oversized files vs a `stat`-then-`read` flow, but saves a `stat` syscall on
 * every other file. Net win because oversized files (>2MB) are rare in the
 * grep-pre-filtered set.
 */
async function processFileAsync(filePath, relativePath, codeOwnersIndex, repoRoot) {
  try {
    const teams = getTeamsForPath(filePath, codeOwnersIndex, repoRoot);
    if (teams.length === 0) {
      return { relativePath, success: true, skipped: true };
    }

    let buffer;
    try {
      buffer = await readFile(filePath);
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

/**
 * Drain a batch of files through `processFileAsync` with at most
 * `READ_CONCURRENCY` reads in flight at once. Index-based dispatch keeps the
 * `results` array aligned with the input order — the worker pool reassembles
 * batches by position, so any reordering would silently mis-attribute imports.
 *
 * Pure (no closure on module state beyond what's passed in) so unit tests can
 * exercise it without a real worker thread.
 */
async function runBatchAsync(files, codeOwnersIndex, repoRoot) {
  const results = new Array(files.length);
  let nextIndex = 0;
  const workerCount = Math.min(READ_CONCURRENCY, files.length);

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (true) {
        const i = nextIndex++;
        if (i >= files.length) return;
        const { filePath, relativePath } = files[i];
        results[i] = await processFileAsync(filePath, relativePath, codeOwnersIndex, repoRoot);
      }
    })
  );

  return results;
}

if (parentPort) {
  // Batched protocol: parent posts `{ files: [{filePath, relativePath}, ...] }`,
  // worker replies once per batch with `{ results: [...] }` containing one
  // entry per input file (in the same order). Per-item errors are reported
  // inline via `success: false`; the worker only throws (and dies) on
  // catastrophic conditions like message-channel failure.
  parentPort.on('message', async (data) => {
    const files = data && Array.isArray(data.files) ? data.files : [];
    const results = await runBatchAsync(files, codeOwnersIndex, REPO_ROOT);
    parentPort.postMessage({ results });
  });
}

module.exports = {
  parseCodeOwners,
  compileLookupIndex,
  getTeamsForPath,
  extractImportsFromContent,
  addPackageIfValid,
  processFileAsync,
  runBatchAsync,
  MAX_FILE_SIZE,
  NPM_PACKAGE_PATTERN,
  READ_CONCURRENCY,
};
