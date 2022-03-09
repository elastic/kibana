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

/**
 * Search the local Kibana repo for bazel packages and return an array of BazelPackage objects
 * representing each package found.
 */
export async function discoverBazelPackages() {
  const packageJsons = globby.sync('*/package.json', {
    cwd: Path.resolve(REPO_ROOT, 'packages'),
    absolute: true,
  });

  return await asyncMapWithLimit(
    packageJsons.sort((a, b) => a.localeCompare(b)),
    10,
    (path) => BazelPackage.fromDir(Path.dirname(path))
  );
}
