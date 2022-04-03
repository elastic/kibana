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
import { asyncMapWithLimit } from '@kbn/std';

import { BazelPackage } from './bazel_package';
import { BAZEL_PACKAGE_DIRS } from './bazel_package_dirs';

export function discoverBazelPackageLocations(repoRoot: string) {
  return globby
    .sync(
      BAZEL_PACKAGE_DIRS.map((dir) => `${dir}/*/package.json`),
      {
        cwd: repoRoot,
        absolute: true,
      }
    )
    .sort((a, b) => a.localeCompare(b))
    .map((path) => Path.dirname(path));
}

export async function discoverBazelPackages(repoRoot: string = REPO_ROOT) {
  return await asyncMapWithLimit(
    discoverBazelPackageLocations(repoRoot),
    100,
    async (dir) => await BazelPackage.fromDir(dir)
  );
}
