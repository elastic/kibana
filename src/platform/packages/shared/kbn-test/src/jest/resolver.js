/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Inspired in a discussion found at https://github.com/facebook/jest/issues/5356 as Jest currently doesn't
// offer any other option to preserve symlinks.
//
// It would be available once https://github.com/facebook/jest/pull/9976 got merged.

const Path = require('path');
const Fs = require('fs');
const resolve = require('resolve');
const { REPO_ROOT } = require('@kbn/repo-info');
const { readPackageMap } = require('@kbn/repo-packages');

// Read the package map once at module load.
const pkgMap = readPackageMap();

const APM_AGENT_MOCK = Path.resolve(__dirname, 'mocks/apm_agent_mock.ts');
const CSS_MODULE_MOCK = Path.resolve(__dirname, 'mocks/css_module_mock.js');
const STYLE_MOCK = Path.resolve(__dirname, 'mocks/style_mock.js');
const FILE_MOCK = Path.resolve(__dirname, 'mocks/file_mock.js');
const WORKER_MOCK = Path.resolve(__dirname, 'mocks/worker_module_mock.js');

const STATIC_FILE_EXT =
  `jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga`
    .split('|')
    .map((e) => `.${e}`);

// ----------------------------------------------------------------------------
// Resolver performance helpers
// ----------------------------------------------------------------------------

// process-wide memoization cache to avoid repeated "resolve" work
const memo = new Map();

/**
 * Build a stable cache key for a resolution request.
 * We include request, basedir, extensions, and whether defaultResolver is present.
 * @param {string} request
 * @param {import('resolve').SyncOpts & { defaultResolver?: Function }} options
 */
function cacheKey(request, options) {
  const exts = Array.isArray(options.extensions)
    ? options.extensions.join(',')
    : String(options.extensions || '');

  const basedir = options.basedir || '';
  const def = options.defaultResolver ? '1' : '0';
  return `${request}|${basedir}|${exts}|${def}`;
}

// Memoize reads of package.json files to reduce IO from resolve.sync
const readFileMemo = new Map();
function memoizedReadFileSync(p, opts) {
  try {
    const pathStr = String(p);
    const isPkgJson = pathStr.endsWith('package.json');
    // Only memoize package.json reads under the repo root to avoid caching user/home files unexpectedly
    if (!isPkgJson || !pathStr.startsWith(REPO_ROOT)) {
      return Fs.readFileSync(p, opts);
    }

    let enc = 'buffer';
    if (typeof opts === 'string') {
      enc = opts;
    } else if (opts && typeof opts === 'object' && opts.encoding) {
      enc = opts.encoding;
    }
    const key = `${pathStr}|${enc}`;
    if (readFileMemo.has(key)) {
      return readFileMemo.get(key);
    }
    const data = Fs.readFileSync(p, opts);
    readFileMemo.set(key, data);
    return data;
  } catch (e) {
    // fall back to native behavior on any unexpected errors
    return Fs.readFileSync(p, opts);
  }
}

/**
 * Store and return a resolved path in the cache.
 * @param {string} key
 * @param {string} result
 */
function cacheSetAndReturn(key, result) {
  memo.set(key, result);

  return result;
}

// Pre-resolve some hot modules once so we don't traverse node_modules repeatedly.
// We resolve them relative to the repo root so they are stable across calls.
const HOT_MODULE_MAP = (() => {
  const entries = new Map();
  try {
    entries.set('axios', resolve.sync('axios/dist/node/axios.cjs', { basedir: REPO_ROOT }));
  } catch (e) {
    // ignore optional pre-resolution failures
  }
  try {
    entries.set(
      '@launchdarkly/js-sdk-common',
      resolve.sync('@launchdarkly/js-sdk-common/dist/cjs/index.cjs', { basedir: REPO_ROOT })
    );
  } catch (e) {
    // ignore optional pre-resolution failures
  }
  try {
    entries.set('ts-api-utils', resolve.sync('ts-api-utils/lib/index.cjs', { basedir: REPO_ROOT }));
  } catch (e) {
    // ignore optional pre-resolution failures
  }
  return entries;
})();

/**
 * @param {string} str
 * @returns
 */
function parseRequestOrExtSuffix(str) {
  const rawSuffix = '?raw';
  if (str.endsWith(rawSuffix)) {
    return str.slice(0, -rawSuffix.length);
  }
  return str;
}

/**
 * @param {string} request
 * @param {import('resolve').SyncOpts} options
 * @returns
 */
module.exports = (request, options) => {
  const key = cacheKey(request, options);

  if (memo.has(key)) {
    return memo.get(key);
  }

  if (request === `@elastic/eui`) {
    return cacheSetAndReturn(key, module.exports(`@elastic/eui/test-env`, options));
  }

  if (request.startsWith('@elastic/eui/lib/')) {
    return cacheSetAndReturn(
      key,
      module.exports(request.replace('@elastic/eui/lib/', '@elastic/eui/test-env/'), options)
    );
  }

  if (HOT_MODULE_MAP.has(request)) {
    return cacheSetAndReturn(key, HOT_MODULE_MAP.get(request));
  }

  if (request === `elastic-apm-node`) {
    return cacheSetAndReturn(key, APM_AGENT_MOCK);
  }

  const reqExt = Path.extname(request);
  if (reqExt) {
    const pRequest = parseRequestOrExtSuffix(request);
    const pReqExt = parseRequestOrExtSuffix(reqExt);
    const reqBasename = Path.basename(pRequest, pReqExt);
    if ((pReqExt === '.css' || pReqExt === '.scss') && reqBasename.endsWith('.module')) {
      return cacheSetAndReturn(key, CSS_MODULE_MOCK);
    }

    if (pReqExt === '.css' || pReqExt === '.less' || pReqExt === '.scss') {
      return cacheSetAndReturn(key, STYLE_MOCK);
    }

    if (STATIC_FILE_EXT.includes(pReqExt)) {
      return cacheSetAndReturn(key, FILE_MOCK);
    }

    if (pReqExt === '.worker' && reqBasename.endsWith('.editor')) {
      return cacheSetAndReturn(key, WORKER_MOCK);
    }
  }

  if (request.endsWith('?asUrl')) {
    return cacheSetAndReturn(key, FILE_MOCK);
  }

  // Helper: strip browser field to prefer Node/CJS entries in tests
  function noBrowserPackageFilter(pkg) {
    if (pkg && pkg.browser) {
      delete pkg.browser;
    }
    return pkg;
  }

  // Helper: ensure resolver options include Node/CJS-friendly conditions and exclude 'browser'
  function withNodeConditions(opts) {
    const base = { ...opts };
    const existing = Array.isArray(opts.conditions) ? opts.conditions : [];
    const merged = [...new Set([...existing, 'require', 'node', 'default'])].filter(
      (c) => c !== 'browser'
    );
    base.conditions = merged;
    return base;
  }

  // Resolve @kbn/* using repo map with minimal IO
  if (request.startsWith('@kbn/')) {
    const [, id, ...sub] = request.split('/');
    const pkgDir = pkgMap.get(`@kbn/${id}`);
    if (!pkgDir) {
      throw new Error(
        `unable to resolve pkg import, pkg '@kbn/${id}' is not in the pkg map. Do you need to bootstrap?`
      );
    }
    const targetAbs = Path.resolve(REPO_ROOT, pkgDir, sub.join('/'));
    try {
      const res = resolve.sync(targetAbs, {
        basedir: Path.dirname(targetAbs),
        extensions: options.extensions,
        readFileSync: memoizedReadFileSync,
        packageFilter: noBrowserPackageFilter,
        preserveSymlinks: false,
      });
      return cacheSetAndReturn(key, res);
    } catch (e) {
      if (options.defaultResolver) {
        try {
          const res = options.defaultResolver(targetAbs, withNodeConditions(options));
          return cacheSetAndReturn(key, res);
        } catch (_) {
          // ignore and rethrow original error below
        }
      }
      throw e;
    }
  }

  const isRelative = request.startsWith('.') || Path.isAbsolute(request);
  const isBare = !isRelative;

  // Bare third-party modules: use Jest's resolver to honor exports/conditions
  if (isBare && options.defaultResolver) {
    try {
      const res = options.defaultResolver(request, withNodeConditions(options));
      return cacheSetAndReturn(key, res);
    } catch (error) {
      if (error && error.code !== 'MODULE_NOT_FOUND') {
        throw error;
      }
      // Fall back to resolve.sync below
    }
  }

  // Relative/absolute, or bare fallback: use resolve with memoized fs
  const resolveOpts = {
    basedir: isRelative ? options.basedir : REPO_ROOT,
    extensions: options.extensions,
    readFileSync: memoizedReadFileSync,
    packageFilter: noBrowserPackageFilter,
    preserveSymlinks: false,
  };
  if (!isRelative) {
    resolveOpts.paths = [Path.join(REPO_ROOT, 'node_modules')];
  }
  const result = resolve.sync(request, resolveOpts);
  return cacheSetAndReturn(key, result);
};
