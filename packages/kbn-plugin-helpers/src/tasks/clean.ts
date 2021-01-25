/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import Fs from 'fs';
import { promisify } from 'util';

import del from 'del';

import { BuildContext } from '../build_context';

const asyncMkdir = promisify(Fs.mkdir);

export async function initTargets({ log, sourceDir, buildDir }: BuildContext) {
  log.info('deleting the build and target directories');
  await del(['build', 'target'], {
    cwd: sourceDir,
  });

  log.debug(`creating build output dir [${buildDir}]`);
  await asyncMkdir(buildDir, { recursive: true });
}
