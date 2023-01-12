/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { mkdir } from 'fs/promises';

import del from 'del';

import { BuildContext } from '../build_context';

export async function initTargets({ log, sourceDir, buildDir }: BuildContext) {
  log.info('deleting the build and target directories');
  await del(['build', 'target'], {
    cwd: sourceDir,
  });

  log.debug(`creating build output dir [${buildDir}]`);
  await mkdir(buildDir, { recursive: true });
}
