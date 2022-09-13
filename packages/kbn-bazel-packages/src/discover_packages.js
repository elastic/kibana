/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { BazelPackage } = require('./bazel_package');
const { getAllBazelPackageDirs } = require('./bazel_package_dirs');
const { findPackages } = require('./find_files');
const { asyncMapWithLimit } = require('./async');

/**
 * Returns an array of all the package manifest paths in the repository
 * @param {string} repoRoot
 */
function discoverPackageManifestPaths(repoRoot) {
  return getAllBazelPackageDirs(repoRoot)
    .flatMap((packageDir) => findPackages(packageDir, 'kibana.jsonc'))
    .sort((a, b) => a.localeCompare(b));
}

/**
 * Resolves to an array of BazelPackage instances which parse the manifest files,
 * package.json files, and provide useful metadata about each package.
 * @param {string} repoRoot
 */
async function discoverBazelPackages(repoRoot) {
  return BazelPackage.sort(
    await asyncMapWithLimit(
      discoverPackageManifestPaths(repoRoot),
      100,
      async (path) => await BazelPackage.fromManifest(repoRoot, path)
    )
  );
}

module.exports = { discoverPackageManifestPaths, discoverBazelPackages };
