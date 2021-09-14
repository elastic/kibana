/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Fs from 'fs';
import Path from 'path';

import execa from 'execa';

import { BuildContext } from '../build_context';

const winVersion = (path: string) => (process.platform === 'win32' ? `${path}.cmd` : path);

export async function yarnInstall({ log, buildDir, config }: BuildContext) {
  const pkgJson = Path.resolve(buildDir, 'package.json');

  if (config?.skipInstallDependencies || !Fs.existsSync(pkgJson)) {
    return;
  }

  log.info('running yarn to install dependencies');
  await execa(winVersion('yarn'), ['install', '--production', '--pure-lockfile'], {
    cwd: buildDir,
  });
}
