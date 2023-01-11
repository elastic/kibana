/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const Path = require('path');
const Fs = require('fs');

const { readPackageMap } = require('./pkg_map');
const { Package } = require('./package');

/**
 * @type {Map<any, any>}
 */
const CACHE = new Map();

function getPkgMap() {
  const cached = CACHE.get(readPackageMap);
  if (cached) {
    return cached;
  }

  const pkgMap = readPackageMap();
  CACHE.set(readPackageMap, pkgMap);
  return pkgMap;
}

/**
 * Resolves to an array of BazelPackage instances which parse the manifest files,
 * package.json files, and provide useful metadata about each package.
 * @param {string} repoRoot
 */
function getPackages(repoRoot) {
  /** @type {Array<import('./package').Package> | undefined} */
  const cached = CACHE.get(repoRoot);
  if (cached) {
    return cached;
  }

  const paths = Array.from(getPkgMap().values(), (rel) =>
    Path.resolve(repoRoot, rel, 'kibana.jsonc')
  );

  const packages = paths
    .flatMap((path) => (Fs.existsSync(path) ? Package.fromManifest(repoRoot, path) : []))
    .sort(Package.sorter);
  CACHE.set(repoRoot, packages);
  return packages;
}

/**
 * Get a map of repoRelative directories to package ids
 */
function getPkgDirMap() {
  /** @type {Map<string, string> | undefined} */
  const cached = CACHE.get(getPkgDirMap);
  if (cached) {
    return cached;
  }

  const pkgMap = getPkgMap();
  /** @type {Map<string, string>} */
  const pkgDirMap = new Map(Array.from(pkgMap, ([k, v]) => [v, k]));
  CACHE.set(getPkgDirMap, pkgDirMap);
  return pkgDirMap;
}

/**
 * Find the package which contains this path, if one exists
 * @param {string} repoRoot
 * @param {string} path absolute path to a file
 */
function findPackageInfoForPath(repoRoot, path) {
  const pkgDirMap = getPkgDirMap();
  const repoRelDir = Path.relative(repoRoot, Path.dirname(path));

  let cur = repoRelDir;
  while (true) {
    if (cur === '.') {
      break;
    }

    const pkgId = pkgDirMap.get(cur);
    if (pkgId) {
      return {
        id: pkgId,
        repoRel: cur,
      };
    }

    cur = Path.dirname(cur);
  }
}

module.exports = { getPackages, findPackageInfoForPath };
