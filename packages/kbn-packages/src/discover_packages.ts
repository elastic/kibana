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

import { Package } from './package';

export async function discoverPackages() {
  const packageJsons = globby.sync('*/package.json', {
    cwd: Path.resolve(REPO_ROOT, 'packages'),
    absolute: true,
  });

  return await asyncMapWithLimit(
    packageJsons.sort((a, b) => a.localeCompare(b)),
    10,
    (path) => Package.fromDir(Path.dirname(path))
  );
}
