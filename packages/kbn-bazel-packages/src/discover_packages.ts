/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';

import globby from 'globby';
import normalizePath from 'normalize-path';
import { REPO_ROOT } from '@kbn/utils';
import { asyncMapWithLimit } from '@kbn/std';

import { BazelPackage } from './bazel_package';
import { BAZEL_PACKAGE_DIRS } from './bazel_package_dirs';

export function discoverBazelPackageLocations(repoRoot: string) {
  const packagesWithPackageJson = globby
    .sync(
      BAZEL_PACKAGE_DIRS.map((dir) => `${dir}/*/package.json`),
      {
        cwd: repoRoot,
        absolute: true,
      }
    )
    // NOTE: removing x-pack for now in case a package is added to the x-pack root folder and a BUILD.bazel
    // is also added into x-pack
    .filter((path) => !normalizePath(path).includes('x-pack/package.json'))
    .sort((a, b) => a.localeCompare(b))
    .map((path) => Path.dirname(path));

  const packagesWithBuildBazel = globby
    .sync(
      BAZEL_PACKAGE_DIRS.map((dir) => `${dir}/*/BUILD.bazel`),
      {
        cwd: repoRoot,
        absolute: true,
      }
    )
    .map((path) => Path.dirname(path))
    .reduce((accum: { [key: string]: boolean }, curr: string) => {
      accum[curr] = true;
      return accum;
    }, {});

  // NOTE: only return as discovered packages the ones with package.json + BUILD.bazel files.
  // In the future we can change this to only discover the ones with kibana.json files.
  return packagesWithPackageJson.filter((pkg) => !!packagesWithBuildBazel[pkg]);
}

export async function discoverBazelPackages(repoRoot: string = REPO_ROOT) {
  return await asyncMapWithLimit(
    discoverBazelPackageLocations(repoRoot),
    100,
    async (dir) => await BazelPackage.fromDir(dir)
  );
}
