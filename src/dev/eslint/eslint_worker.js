/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Forked by run_eslint_full.ts with `{ fix, cache }` as JSON in argv: lints each chunk of files it
// receives and replies with `{ errorCount, output }` for errors only, like `eslint --quiet`. One
// long-lived ESLint instance keeps config and module caches warm across chunks.
const Fs = require('fs');
const { ESLint } = require('eslint');

const memoize = (fn) => {
  const results = new Map();
  return (path) => {
    if (!results.has(path)) {
      results.set(path, fn(path));
    }
    return results.get(path);
  };
};
const statSafe = memoize((path) => {
  try {
    return Fs.statSync(path, { throwIfNoEntry: false });
  } catch {
    return undefined;
  }
});

const { fix, cache } = JSON.parse(process.argv[2]);
const eslint = new ESLint({
  // A long-lived instance would record fixed files' new mtimes next to their pre-fix results, so a
  // later cached run would trust stale results; fix runs don't use the cache.
  cache: cache && !fix,
  // Mirrors ESLint CLI's `--quiet` behavior: only autofix errors, never warnings.
  fix: fix && ((message) => message.severity === 2),
  // Files don't appear or disappear during a run, so eslint-plugin-import keeps resolutions for the
  // whole run instead of its default 30s, and its node resolver reuses file system lookups instead
  // of re-reading every package.json up the tree for each import.
  overrideConfig: {
    settings: {
      'import/cache': { lifetime: Infinity },
      'import/resolver': {
        node: {
          isFile: (path) => {
            const stat = statSafe(path);
            return !!stat && (stat.isFile() || stat.isFIFO());
          },
          isDirectory: (path) => !!statSafe(path)?.isDirectory(),
          readFileSync: memoize(Fs.readFileSync),
        },
      },
    },
  },
});
const formatterPromise = eslint.loadFormatter('stylish');

process.on('message', async (files) => {
  const results = await eslint.lintFiles(files);
  if (fix) {
    await ESLint.outputFixes(results);
  }

  const errorResults = ESLint.getErrorResults(results);
  const errorCount = errorResults.reduce((count, result) => count + result.errorCount, 0);
  const output = errorCount > 0 ? await (await formatterPromise).format(errorResults) : '';
  process.send({ errorCount, output });
});
