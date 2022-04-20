/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';

import globby from 'globby';
import { REPO_ROOT } from '@kbn/utils';

/**
 * This is a list of repo-relative paths to directories containing packages. Do not
 * include `**` in these, one or two `*` segments is acceptable, we need this search
 * to be super fast so please avoid deep recursive searching.
 *
 *   eg. src/vis_editors     => would find a package at src/vis_editors/foo/package.json
 *       src/vis_editors/*   => would find a package at src/vis_editors/foo/bar/package.json
 */
export const BAZEL_PACKAGE_DIRS = [
  'packages',
  'packages/shared-ux/*',
  'packages/analytics',
  'packages/analytics/shippers',
];

/**
 * Resolve all the BAZEL_PACKAGE_DIRS to absolute paths
 */
export function getAllBazelPackageDirs() {
  return globby.sync(BAZEL_PACKAGE_DIRS, {
    cwd: REPO_ROOT,
    onlyDirectories: true,
    expandDirectories: false,
  });
}

/**
 * Resolve all the BAZEL_PACKAGE_DIRS to repo-relative paths
 */
export function getAllRepoRelativeBazelPackageDirs() {
  return getAllBazelPackageDirs().map((path) => Path.relative(REPO_ROOT, path));
}
