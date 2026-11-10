/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Keys used in the repo that are not in the caller's `sortOrder`, in the order the
 * `sort-package-json` library placed them. Unknown keys go after these, alphabetically.
 */
const DEFAULT_ORDER = [
  'name',
  'version',
  'private',
  'description',
  'keywords',
  'homepage',
  'bugs',
  'repository',
  'license',
  'author',
  'sideEffects',
  'type',
  'imports',
  'exports',
  'main',
  'browser',
  'types',
  'typings',
  'bin',
  'files',
  'scripts',
  'resolutions',
  'overrides',
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
  'packageManager',
  'engines',
];

const ALPHABETICAL_OBJECTS = [
  'bin',
  'engines',
  'resolutions',
  'overrides',
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
];

/** npm lifecycle scripts whose pre/post hooks are grouped with them even when the script itself is absent */
const NPM_LIFECYCLE_SCRIPTS = new Set([
  'install',
  'pack',
  'prepare',
  'publish',
  'restart',
  'shrinkwrap',
  'start',
  'stop',
  'test',
  'uninstall',
  'version',
]);

/**
 * Sort a package.json string, covering the subset of `sort-package-json` rules Kibana's package.json files use.
 * @param {string} json
 * @param {{ sortOrder: string[] }} options
 * @returns {string}
 */
export function sorter(json, { sortOrder }) {
  const order = [...new Set([...sortOrder, ...DEFAULT_ORDER])];
  const sorted = sortKeys(JSON.parse(json), (a, b) => compareTopLevelKeys(order, a, b));

  for (const key of ALPHABETICAL_OBJECTS) {
    if (isPlainObject(sorted[key])) {
      sorted[key] = sortKeys(sorted[key], compareCodeUnits);
    }
  }
  if (isPlainObject(sorted.scripts)) {
    sorted.scripts = sortScripts(sorted.scripts);
  }
  if (isPlainObject(sorted.exports)) {
    sorted.exports = sortExports(sorted.exports);
  }

  return JSON.stringify(sorted, null, 2);
}

/** known keys by their position, then unknown keys alphabetically, then `_`-prefixed private keys */
function compareTopLevelKeys(order, a, b) {
  return topLevelRank(order, a) - topLevelRank(order, b) || compareCodeUnits(a, b);
}

function topLevelRank(order, key) {
  const index = order.indexOf(key);
  if (index !== -1) {
    return index;
  }
  return order.length + (key.startsWith('_') ? 1 : 0);
}

/** alphabetical by `:`-separated segments, with `preX`/`postX` placed around `X` */
function sortScripts(scripts) {
  const names = Object.keys(scripts);
  const hookTarget = (name) => {
    const base = name.replace(/^(?:pre|post)/, '');
    return base !== name && (NPM_LIFECYCLE_SCRIPTS.has(base) || names.includes(base))
      ? base
      : undefined;
  };
  const sortKey = (name) => {
    const base = hookTarget(name);
    if (base === undefined) {
      return [name.split(':'), 1];
    } else {
      return [base.split(':'), name.startsWith('pre') ? 0 : 2];
    }
  };

  return sortKeys(scripts, (a, b) => {
    const [segmentsA, hookA] = sortKey(a);
    const [segmentsB, hookB] = sortKey(b);
    return compareSegments(segmentsA, segmentsB) || hookA - hookB;
  });
}

/** keeps key order, recursively, except subpaths go first and the `default` condition goes last */
function sortExports(exports) {
  const sorted = sortKeys(exports, (a, b) => exportKeyRank(a) - exportKeyRank(b));
  for (const [key, value] of Object.entries(sorted)) {
    if (isPlainObject(value)) {
      sorted[key] = sortExports(value);
    }
  }
  return sorted;
}

function exportKeyRank(key) {
  if (key.startsWith('.')) {
    return 0;
  } else {
    return key === 'default' ? 2 : 1;
  }
}

function compareSegments(a, b) {
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    const result = compareCodeUnits(a[i], b[i]);
    if (result !== 0) {
      return result;
    }
  }
  return a.length - b.length;
}

function compareCodeUnits(a, b) {
  if (a === b) {
    return 0;
  } else {
    return a < b ? -1 : 1;
  }
}

function sortKeys(object, compare) {
  return Object.fromEntries(Object.entries(object).sort(([a], [b]) => compare(a, b)));
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
