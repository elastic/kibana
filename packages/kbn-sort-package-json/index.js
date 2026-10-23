/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Top level keys: the order they were written in when this was implemented, followed by the
 * remaining keys used in the repo in the order `sort-package-json` placed them. Unknown keys go
 * after these, alphabetically.
 */
const TOP_LEVEL_ORDER = [
  'name',
  'description',
  'keywords',
  'private',
  'version',
  'branch',
  'main',
  'browser',
  'types',
  'tsdocMetadata',
  'build',
  'homepage',
  'bugs',
  'license',
  'kibana',
  'author',
  'scripts',
  'repository',
  'engines',
  'resolutions',
  'sideEffects',
  'type',
  'imports',
  'exports',
  'typings',
  'bin',
  'files',
  'overrides',
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
  'packageManager',
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
 * Sort a package.json the way Kibana expects and serialize it with 2 space indentation.
 * @param {string | Record<string, any>} json
 * @returns {string}
 */
export function sortPackageJson(json) {
  const pkg = typeof json === 'string' ? JSON.parse(json) : json;

  const sorted = sortKeys(pkg, compareTopLevelKeys);
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

function compareTopLevelKeys(a, b) {
  return topLevelRank(a) - topLevelRank(b) || compareCodeUnits(a, b);
}

/** known keys by their position, then unknown keys, then `_`-prefixed private keys */
function topLevelRank(key) {
  const index = TOP_LEVEL_ORDER.indexOf(key);
  if (index !== -1) {
    return index;
  }
  return TOP_LEVEL_ORDER.length + (key.startsWith('_') ? 1 : 0);
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
