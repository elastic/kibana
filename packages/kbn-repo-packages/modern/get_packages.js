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

/** @typedef {Map<string, import('./package').Package>} PkgDirMap */

/**
 * @type {Map<any, any>}
 */
const CACHE = new Map();

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

  const paths = Array.from(readPackageMap().values(), (rel) =>
    Path.resolve(repoRoot, rel, 'kibana.jsonc')
  );

  const packages = paths.flatMap((path) => Fs.existsSync(path) ? Package.fromManifest(repoRoot, path) : []).sort(Package.sorter);
  CACHE.set(repoRoot, packages);
  return packages;
}

/**
 * Get a map of repoRelative directories to packages
 * @param {string} repoRoot
 */
function getPkgDirMap(repoRoot) {
  const packages = getPackages(repoRoot);
  /** @type {PkgDirMap | undefined} */
  const cached = CACHE.get(packages);
  if (cached) {
    return cached;
  }

  const pkgDirMap = new Map(packages.map((p) => [p.normalizedRepoRelativeDir, p]));
  CACHE.set(packages, pkgDirMap);
  return pkgDirMap;
}

/**
 * Find the package which contains this path, if one exists
 * @param {string} repoRoot
 * @param {string} path absolute path to a file
 */
function findPackageForPath(repoRoot, path) {
  const pkgDirMap = getPkgDirMap(repoRoot);
  const repoRelDir = Path.relative(repoRoot, Path.dirname(path));
  let cur = repoRelDir;
  while (true) {
    const pkg = pkgDirMap.get(cur);
    if (pkg) {
      return pkg;
    }

    if (cur !== '.') {
      const next = Path.dirname(cur);
      if (next !== '.') {
        cur = next;
        continue;
      }
    }

    break;
  }
}

module.exports = { getPackages, getPkgDirMap, findPackageForPath };
