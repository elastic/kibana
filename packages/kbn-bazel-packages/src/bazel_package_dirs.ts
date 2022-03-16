/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * This is a list of repo-relative paths to directories containing packages. Do not
 * include `**` in these, one or two `*` segments is acceptable, we need this search
 * to be super fast so please avoid deep recursive searching.
 *
 *   eg. src/vis-editors     => would find a package at src/vis-editors/foo/package.json
 *       src/vis-editors/*   => would find a package at src/vis-editors/foo/bar/package.json
 */
export const BAZEL_PACKAGE_DIRS = ['packages'];
