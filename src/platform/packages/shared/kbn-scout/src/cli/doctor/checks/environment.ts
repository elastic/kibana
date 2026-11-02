/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import Path from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import type { DoctorCheckGroup } from '../types';
import { fail, pass, warn } from '../types';
import { formatAge, formatBytes } from '../utils';

const MIN_FREE_DISK_SPACE = 20 * 1024 ** 3;

export const environmentChecks: DoctorCheckGroup = {
  title: 'Environment',
  checks: [
    {
      title: 'Dependencies',
      run: async () => {
        const [lockfile, installed] = await Promise.all(
          ['pnpm-lock.yaml', 'node_modules/.modules.yaml'].map((path) =>
            Fs.promises.stat(Path.resolve(REPO_ROOT, path)).catch(() => undefined)
          )
        );
        if (!installed) {
          return fail('Dependencies are not installed', {
            fix: { command: 'node scripts/kbn bootstrap' },
          });
        }
        if (lockfile && lockfile.mtimeMs > installed.mtimeMs) {
          return warn('pnpm-lock.yaml changed since the last bootstrap', {
            fix: { command: 'node scripts/kbn bootstrap' },
          });
        }
        return pass(`Dependencies installed ${formatAge(installed.mtime)}`);
      },
    },
    {
      title: 'Disk space',
      run: async () => {
        const { bavail, bsize } = await Fs.promises.statfs(REPO_ROOT);
        const free = bavail * bsize;
        return free < MIN_FREE_DISK_SPACE
          ? warn(`Only ${formatBytes(free)} free disk space, ES and browsers need more`)
          : pass(`${formatBytes(free)} free disk space`);
      },
    },
  ],
};
