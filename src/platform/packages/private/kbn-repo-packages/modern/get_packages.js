/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const Fs = require('fs');
const Path = require('path');
const Crypto = require('crypto');

const { Package } = require('./package');
const { getRepoRelsSync } = require('./get_repo_rels');

const PACKAGE_MAP_PATH = Path.resolve(__dirname, '../package-map.json');

/** @typedef {Map<string, import('./package').Package>} PkgDirMap */
/** @typedef {Map<string, import('./package').Package>} PkgsById */

/**
 * @type {Map<any, any>}
 */
const CACHE = new Map();

/**
 * Read the pkgmap from disk and parse it into a Map
 * @returns {Map<string, string>}
 */
function readPackageMap() {
  return new Map(JSON.parse(Fs.readFileSync(PACKAGE_MAP_PATH, 'utf8')));
}

/**
 * Get the hash of the pkgmap, used for populating some cache keys
 * @returns {string}
 */
function readHashOfPackageMap() {
  return Crypto.createHash('sha256').update(Fs.readFileSync(PACKAGE_MAP_PATH)).digest('hex');
}

/**
 * @param {string} repoRoot
 * @param {string[]} manifestPaths
 */
function updatePackageMap(repoRoot, manifestPaths) {
  const existingContent = Fs.existsSync(PACKAGE_MAP_PATH)
    ? Fs.readFileSync(PACKAGE_MAP_PATH, 'utf8')
    : '';

  const uniquePaths = new Set(manifestPaths.filter((f) => !f.includes('/__fixtures__/')));
  const pkgs = Array.from(uniquePaths)
    .map((path) => Package.fromManifest(repoRoot, path))
    .sort(Package.sorter);
  const map = new Map(pkgs.map((pkg) => [pkg.id, pkg.normalizedRepoRelativeDir]));

  if (map.size !== uniquePaths.size) {
    /** @type {Map<string, string[]>} */
    const dirsById = new Map();
    for (const pkg of pkgs) {
      const path = Path.join(pkg.directory, 'kibana.jsonc');
      const group = dirsById.get(pkg.manifest.id);
      if (group) {
        group.push(path);
      } else {
        dirsById.set(pkg.manifest.id, [path]);
      }
    }

    const list = Array.from(dirsById)
      .filter((e) => e[1].length > 1)
      .flatMap(([pkgId, paths]) => [`${pkgId}:`, ...paths.map((p) => `  - ${p}`)])
      .join('\n');

    throw new Error(`Multiple packages found using the same id:\n${list}`);
  }

  const newContent = JSON.stringify(Array.from(map), null, 2);

  if (newContent === existingContent) {
    if (!CACHE.has(repoRoot)) {
      CACHE.set(repoRoot, pkgs);
    }

    return false;
  }

  CACHE.clear();
  CACHE.set(repoRoot, pkgs);
  Fs.writeFileSync(PACKAGE_MAP_PATH, newContent);
  return true;
}

/**
 * Resolves to an array of BazelPackage instances which parse the manifest files,
 * package.json files, and provide useful metadata about each package.
 * @param {string} repoRoot
 * @returns {Package[]}
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

  try {
    const packages = paths.map((path) => Package.fromManifest(repoRoot, path)).sort(Package.sorter);
    CACHE.set(repoRoot, packages);
    return packages;
  } catch (error) {
    if (error.code === 'ENOENT') {
      // a package manifest was removed, auto-regenerate the package map
      const manifests = Array.from(getRepoRelsSync(repoRoot, ['**/kibana.jsonc']));
      if (updatePackageMap(repoRoot, manifests)) {
        return getPackages(repoRoot);
      }
    }

    throw error;
  }
}

/**
 * Get a map of repoRelative directories to packages
 * @param {string} repoRoot
 */
function getPkgDirMap(repoRoot) {
  const packages = getPackages(repoRoot);

  const cacheKey = `getPkgDirMap-${repoRoot}`;
  /** @type {PkgDirMap | undefined} */
  const cached = CACHE.get(cacheKey);
  if (cached) {
    return cached;
  }

  const pkgDirMap = new Map(packages.map((p) => [p.normalizedRepoRelativeDir, p]));
  CACHE.set(cacheKey, pkgDirMap);
  return pkgDirMap;
}

/**
 * Get a map of packages by id
 * @param {string} repoRoot
 * @returns {PkgsById}
 */
function getPkgsById(repoRoot) {
  const packages = getPackages(repoRoot);

  const cacheKey = `getPkgsById-${repoRoot}`;
  /** @type {PkgsById | undefined} */
  const cached = CACHE.get(cacheKey);
  if (cached) {
    return cached;
  }

  const pkgsById = new Map(packages.map((p) => [p.id, p]));
  CACHE.set(cacheKey, pkgsById);
  return pkgsById;
}

/**
 *
 * @template T
 * @param {string} repoRelDir
 * @param {Map<string, T>} map
 * @returns {T | undefined}
 */
function findClosest(repoRelDir, map) {
  let cur = repoRelDir;
  while (true) {
    if (!cur || cur === '.') {
      break;
    }

    const pkg = map.get(cur);
    if (pkg) {
      return pkg;
    }

    cur = Path.dirname(cur);
  }
}

/**
 * Find the package which contains this path, if one exists
 * @param {string} repoRoot
 * @param {string} path absolute path to a file
 */
function findPackageForPath(repoRoot, path) {
  return findClosest(Path.relative(repoRoot, Path.dirname(path)), getPkgDirMap(repoRoot));
}

module.exports = {
  getPackages,
  getPkgDirMap,
  getPkgsById,
  updatePackageMap,
  findPackageForPath,
  readPackageMap,
  readHashOfPackageMap,
};
