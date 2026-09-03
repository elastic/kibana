/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { REPO_ROOT } from '@kbn/repo-info';

import type { GlobalTask } from '../lib';
import { exec } from '../lib';

export const BuildPackageWebpackBundles: GlobalTask = {
  global: true,
  description: 'Building webpack artifacts required by packages',

  async run(_config, log) {
    await exec(log, 'yarn', ['kbn', 'build-shared', '--dist', '--no-cache'], {
      cwd: REPO_ROOT,
      level: 'info',
    });
  },
};
