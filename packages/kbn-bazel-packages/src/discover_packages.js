/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const Path = require('path');

const { BazelPackage } = require('./bazel_package');
const { getAllBazelPackageDirs } = require('./bazel_package_dirs');
const { findPackages } = require('./find_files');
const { asyncMapWithLimit } = require('./async');

/**
 * @param {string} repoRoot
 */
function discoverBazelPackageLocations(repoRoot) {
  const packagesWithBuildBazel = getAllBazelPackageDirs(repoRoot)
    .flatMap((packageDir) => findPackages(packageDir, 'BUILD.bazel'))
    .map((path) => Path.dirname(path));

  // NOTE: only return as discovered packages with a package.json + BUILD.bazel file.
  // In the future we should change this to only discover the ones with kibana.jsonc.
  return getAllBazelPackageDirs(repoRoot)
    .flatMap((packageDir) => findPackages(packageDir, 'package.json'))
    .map((path) => Path.dirname(path))
    .filter((pkg) => packagesWithBuildBazel.includes(pkg))
    .sort((a, b) => a.localeCompare(b));
}

/**
 * @param {string} repoRoot
 */
async function discoverBazelPackages(repoRoot) {
  return await asyncMapWithLimit(
    discoverBazelPackageLocations(repoRoot),
    100,
    async (dir) => await BazelPackage.fromDir(repoRoot, dir)
  );
}

module.exports = { discoverBazelPackageLocations, discoverBazelPackages };
