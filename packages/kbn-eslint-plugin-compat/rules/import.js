/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const Fs = require('fs');
const { rules } = require('eslint-plugin-import');

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

// Files don't appear or disappear during a lint run, so the node resolver reuses file system
// lookups instead of re-reading every package.json up the tree for each import. Oxlint passes
// settings through JSON, so these functions can't be set in `.oxlint/` and are added here.
const RESOLVER_SETTINGS = {
  node: {
    isFile: (path) => {
      const stat = statSafe(path);
      return !!stat && (stat.isFile() || stat.isFIFO());
    },
    isDirectory: (path) => !!statSafe(path)?.isDirectory(),
    readFileSync: memoize(Fs.readFileSync),
  },
};

const withCachedResolver = (rule) => ({
  ...rule,
  create: (context) =>
    rule.create(
      Object.create(context, {
        settings: { value: { ...context.settings, 'import/resolver': RESOLVER_SETTINGS } },
      })
    ),
});

// eslint-plugin-import rules that oxlint doesn't implement.
module.exports = {
  'import-no-extraneous-dependencies': withCachedResolver(rules['no-extraneous-dependencies']),
  'import-order': withCachedResolver(rules.order),
};
