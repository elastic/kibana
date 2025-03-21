/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';
import execa from 'execa';

import { REPO_ROOT } from '@kbn/repo-info';
import { TaskContext } from '../task_context';

export async function buildWebpackPackages({ log, quiet, dist }: TaskContext) {
  log.info('building required artifacts for the optimizer');

  const packagesToBuild = ['kbn-ui-shared-deps-npm', 'kbn-ui-shared-deps-src', 'kbn-monaco'];

  async function buildPackage(packageName: string) {
    const stdioOptions: Array<'ignore' | 'pipe' | 'inherit'> = quiet
      ? ['ignore', 'pipe', 'pipe']
      : ['inherit', 'inherit', 'inherit'];

    await execa('yarn', ['build', '--quiet', ...(dist ? ['--dist'] : [])], {
      cwd: path.resolve(REPO_ROOT, 'packages', packageName),
      stdio: stdioOptions,
    });
  }

  for (const pkg of packagesToBuild) {
    await buildPackage(pkg);
  }
  log.success('required artifacts were created');
}
