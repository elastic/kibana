/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const Path = require('path');
const Fs = require('fs');
const ChildProcess = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(ChildProcess.execFile);

/**
 * @param {string} repoRoot
 * @param {string} output
 * @returns {Iterable<string>}
 */
function parseLsFilesOutput(repoRoot, output) {
  const files = new Set();

  for (const line of output.split('\n').map((l) => l.trim())) {
    if (!line) {
      continue;
    }

    const repoRel = line.slice(2); // trim the single char status and separating space from the line
    if (line.startsWith('C ')) {
      // this line indicates that the previous path is changed in the working
      // tree, so we need to determine if it was deleted and remove it if so
      if (!Fs.existsSync(Path.resolve(repoRoot, repoRel))) {
        files.delete(repoRel);
      }
    } else {
      files.add(repoRel);
    }
  }

  return files;
}

/**
 * @param {string} repoRoot
 * @param {string[] | undefined} include
 * @param {string[] | undefined} exclude
 * @returns {string[]}
 */
function getGitFlags(repoRoot, include = undefined, exclude = undefined) {
  return [
    'ls-files',
    '-comt',
    '--exclude-standard',
    include?.map((p) => (Path.isAbsolute(p) ? Path.relative(repoRoot, p) : p)) ?? [],
    exclude?.map((p) => `--exclude=${Path.isAbsolute(p) ? Path.relative(repoRoot, p) : p}`) ?? [],
  ].flat();
}

/**
 * List the files in the repo, only including files which are managed by version
 * control or "untracked" (new, not committed, and not ignored). Falls back to a
 * filesystem walk that skips a fixed set of generated/ignored directories when
 * `git ls-files` is unavailable (e.g. tarball checkout, jj workspace).
 * @param {string} repoRoot limit the list to specfic absolute paths
 * @param {string[] | undefined} include limit the list to specfic absolute paths
 * @param {string[] | undefined} exclude exclude specific absolute paths
 * @returns {Promise<Iterable<string>>}
 */
async function getRepoRels(repoRoot, include = undefined, exclude = undefined) {
  try {
    const proc = await execAsync('git', getGitFlags(repoRoot, include, exclude), {
      cwd: repoRoot,
      encoding: 'utf8',
      maxBuffer: Infinity,
    });
    return parseLsFilesOutput(repoRoot, proc.stdout);
  } catch {
    return fsWalkFallback(repoRoot, include, exclude);
  }
}

/**
 * Synchronously list the files in the repo, only including files which are managed by version
 * control or "untracked" (new, not committed, and not ignored). Falls back to a
 * filesystem walk that skips a fixed set of generated/ignored directories when
 * `git ls-files` is unavailable (e.g. tarball checkout, jj workspace).
 * @param {string} repoRoot limit the list to specfic absolute paths
 * @param {string[] | undefined} include limit the list to specfic absolute paths
 * @param {string[] | undefined} exclude exclude specific absolute paths
 * @returns {Iterable<string>}
 */
function getRepoRelsSync(repoRoot, include = undefined, exclude = undefined) {
  try {
    const stdout = ChildProcess.execFileSync('git', getGitFlags(repoRoot, include, exclude), {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return parseLsFilesOutput(repoRoot, stdout);
  } catch {
    return fsWalkFallback(repoRoot, include, exclude);
  }
}

/** ====================================================
 *  Fallback: use the filesystem if `git ls-files` fails
 *  ====================================================
 */

/**
 * @typedef {{ names: Set<string>; rootRelPaths: Set<string> }} FallbackSkipSet
 */

/** @type {Map<string, FallbackSkipSet>} */
const skipSetCache = new Map();

/**
 * Read the repo's `.gitignore` and extract directory entries suitable for
 * pruning during the fallback FS walk. `ignore` package is also able to parse
 * .gitignore but isn't yet available if this code is being run during bootstrap
 * @param {string} repoRoot
 * @returns {FallbackSkipSet}
 */
function loadFallbackSkipSet(repoRoot) {
  const cached = skipSetCache.get(repoRoot);
  if (cached) {
    return cached;
  }

  // Always skip VCS metadata; never useful but not always present in .gitignore
  const result = { names: new Set(['.git', '.jj']), rootRelPaths: new Set() };

  let gitignore;
  try {
    gitignore = Fs.readFileSync(Path.join(repoRoot, '.gitignore'), 'utf8');
  } catch {
    skipSetCache.set(repoRoot, result);
    return result;
  }

  for (const raw of gitignore.split('\n')) {
    const line = raw.trim();
    // Ignore comments
    if (!line || line.startsWith('#') || line.startsWith('!')) {
      continue;
    }

    const stripped = line.replace(/^\//, '').replace(/\/$/, ''); // Strip leading and trailing slashes
    const hasIntermediateSlash = stripped.includes('/');
    const hasGlob = /[*?[\]]/.test(stripped); // *, ?, [ or ] (gitignore glob chars)
    if (!stripped || hasIntermediateSlash || hasGlob) {
      continue;
    }

    const isRootRelative = line.startsWith('/');
    if (isRootRelative) {
      result.rootRelPaths.add(stripped);
    } else {
      result.names.add(stripped);
    }
  }

  skipSetCache.set(repoRoot, result);
  return result;
}

/**
 * Strip a leading `.` from each path segment. Node's `path.matchesGlob`
 * treats dot-prefixed segments as hidden and refuses to let `**` traverse
 * them, so without this e.g. `.storybook/kibana.jsonc` would silently fall out
 * of the result set.
 * @param {string} segPath
 * @returns string
 */
function undot(segPath) {
  return segPath
    .replace(/\\/g, '/')
    .split('/')
    .map((seg) => (seg === '.' || seg === '..' ? seg : seg.replace(/^\./, '')))
    .join('/');
}

/**
 * @param {string} repoRoot
 * @param {string[] | undefined} include
 * @param {string[] | undefined} exclude
 * @returns {Set<string>}
 */
function fsWalkFallback(repoRoot, include = undefined, exclude = undefined) {
  const includePatterns = include?.map((p) =>
    undot(Path.isAbsolute(p) ? Path.relative(repoRoot, p) : p)
  );
  const excludePatterns = exclude?.map((p) =>
    undot(Path.isAbsolute(p) ? Path.relative(repoRoot, p) : p)
  );
  const skipSet = loadFallbackSkipSet(repoRoot);

  const files = new Set();

  /** @param {string} absDir */
  const walk = (absDir) => {
    let entries;
    try {
      entries = Fs.readdirSync(absDir, { withFileTypes: true });
    } catch {
      return;
    }

    const atRepoRoot = absDir === repoRoot;

    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (skipSet.names.has(entry.name)) {
          continue;
        }
        if (atRepoRoot && skipSet.rootRelPaths.has(entry.name)) {
          continue;
        }
        walk(Path.join(absDir, entry.name));
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      const repoRel = Path.relative(repoRoot, Path.join(absDir, entry.name));
      const repoRelForMatch = undot(repoRel);
      if (
        includePatterns &&
        !includePatterns.some((pat) => Path.matchesGlob(repoRelForMatch, pat))
      ) {
        continue;
      }
      if (
        excludePatterns &&
        excludePatterns.some((pat) => Path.matchesGlob(repoRelForMatch, pat))
      ) {
        continue;
      }
      files.add(repoRel);
    }
  };

  walk(repoRoot);
  return files;
}

module.exports = { getRepoRels, getRepoRelsSync };
