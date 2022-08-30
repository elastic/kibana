/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/** @typedef {import('./bazel_package').BazelPackage} BazelPackage */

const { BAZEL_PACKAGE_DIRS, getAllBazelPackageDirs } = require('./bazel_package_dirs');
const { discoverBazelPackageLocations, discoverBazelPackages } = require('./discover_packages');

module.exports = {
  BAZEL_PACKAGE_DIRS,
  getAllBazelPackageDirs,
  discoverBazelPackageLocations,
  discoverBazelPackages,
};
