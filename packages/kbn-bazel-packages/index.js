/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/** @typedef {import('./src/bazel_package').BazelPackage} BazelPackage */
/** @typedef {import('./src/types').KibanaPackageManifest} KibanaPackageManifest */
/** @typedef {import('./src/types').KibanaPackageType} KibanaPackageType */
/** @typedef {import('./src/types').ParsedPackageJson} ParsedPackageJson */

const { BAZEL_PACKAGE_DIRS, getAllBazelPackageDirs } = require('./src/bazel_package_dirs');
const { discoverPackageManifestPaths, discoverBazelPackages } = require('./src/discover_packages');
const {
  parsePackageManifest,
  readPackageManifest,
  validatePackageManifest,
} = require('./src/parse_package_manifest');
const Jsonc = require('./src/jsonc');

module.exports = {
  BAZEL_PACKAGE_DIRS,
  getAllBazelPackageDirs,
  discoverPackageManifestPaths,
  discoverBazelPackages,
  parsePackageManifest,
  readPackageManifest,
  validatePackageManifest,
  Jsonc,
};
