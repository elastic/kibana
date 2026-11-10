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
import { formatBytes } from '@kbn/es';
import type { DoctorCheck } from '../types';
import { fail, pass, warn } from '../types';
import { formatAge } from '../utils';

const MIN_FREE_DISK_SPACE = 20 * 1024 ** 3;

export const environmentChecks: DoctorCheck[] = [
  {
    title: 'Kibana bootstrap',
    run: async () => {
      const [lockfile, installed] = await Promise.all(
        ['pnpm-lock.yaml', 'node_modules/.modules.yaml'].map((path) =>
          Fs.promises.stat(Path.resolve(REPO_ROOT, path)).catch(() => undefined)
        )
      );
      if (!installed) {
        return fail('Kibana is not bootstrapped', {
          fix: { command: 'node scripts/kbn bootstrap' },
        });
      }
      if (lockfile && lockfile.mtimeMs > installed.mtimeMs) {
        return warn('Kibana bootstrap is out of date, pnpm-lock.yaml changed', {
          fix: { command: 'node scripts/kbn bootstrap' },
        });
      }
      return pass(`Kibana bootstrapped ${formatAge(installed.mtime)}`);
    },
  },
  {
    title: 'Disk space',
    run: async () => {
      const { bavail, bsize } = await Fs.promises.statfs(REPO_ROOT);
      const free = bavail * bsize;
      return free < MIN_FREE_DISK_SPACE
        ? warn(`Only ${formatBytes(free)} free disk space, 20 GB recommended`)
        : pass(`${formatBytes(free)} free disk space`);
    },
  },
];
