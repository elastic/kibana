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

import execa from 'execa';

import { TaskContext } from '../task_context';

const winVersion = (path: string) => (process.platform === 'win32' ? `${path}.cmd` : path);

export async function yarnInstall({ log, buildDir, config }: TaskContext) {
  const pkgJson = Path.resolve(buildDir, 'package.json');

  if (config?.skipInstallDependencies || !Fs.existsSync(pkgJson)) {
    return;
  }

  log.info('running yarn to install dependencies');
  await execa(winVersion('yarn'), ['install', '--production', '--pure-lockfile'], {
    cwd: buildDir,
  });
}
