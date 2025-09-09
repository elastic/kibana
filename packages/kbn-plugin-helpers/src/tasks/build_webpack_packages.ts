/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { StdioOption } from 'execa';
import execa from 'execa';

import { REPO_ROOT } from '@kbn/repo-info';
import type { TaskContext } from '../task_context';

export async function buildWebpackPackages({ log, quiet, dist }: TaskContext) {
  log.info('building required artifacts for the optimizer');

  const stdio: StdioOption[] = quiet
    ? ['ignore', 'pipe', 'pipe']
    : ['inherit', 'inherit', 'inherit'];

  const args = ['kbn', 'build-shared'];
  if (quiet) args.push('--quiet');
  if (dist) args.push('--dist');

  await execa('yarn', args, { cwd: REPO_ROOT, stdio });
}
