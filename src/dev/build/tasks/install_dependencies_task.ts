/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Task } from '../lib';
import { exec } from '../lib';

export const InstallDependencies: Task = {
  description: 'Installing node_modules, including production builds of packages',

  async run(_config, log, build) {
    await exec(
      log,
      'pnpm',
      [
        'install',
        '--prod',
        '--no-frozen-lockfile',
        '--config.confirmModulesPurge=false',
        '--prefer-offline',
      ],
      {
        cwd: build.resolvePath(),
      }
    );
  },
};
