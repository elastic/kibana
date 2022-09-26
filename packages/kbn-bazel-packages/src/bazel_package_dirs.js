/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { expandWildcards } = require('./find_files');

/**
 * This is a list of repo-relative paths to directories containing packages. Do not
 * include `**` in these, one or two `*` segments is acceptable, we need this search
 * to be super fast so please avoid deep recursive searching.
 *
 *   eg. src/vis_editors     => would find a package at src/vis_editors/foo/package.json
 *       src/vis_editors/*   => would find a package at src/vis_editors/foo/bar/package.json
 */
const BAZEL_PACKAGE_DIRS = [
  'packages',
  'packages/shared-ux',
  'packages/shared-ux/*',
  'packages/shared-ux/*/*',
  'packages/analytics',
  'packages/analytics/shippers',
  'packages/analytics/shippers/elastic_v3',
  'packages/core/*',
  'packages/home',
  'packages/content-management',
  'x-pack/packages/ml',
];

/**
 * Resolve all the BAZEL_PACKAGE_DIRS to absolute paths
 * @param {string} repoRoot
 */
function getAllBazelPackageDirs(repoRoot) {
  return expandWildcards(repoRoot, BAZEL_PACKAGE_DIRS);
}

module.exports = {
  BAZEL_PACKAGE_DIRS,
  getAllBazelPackageDirs,
};
