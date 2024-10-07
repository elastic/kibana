/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { pipeline } from 'stream';
import { promisify } from 'util';

import vfs from 'vinyl-fs';

import { TaskContext } from '../task_context';

const asyncPipeline = promisify(pipeline);

export async function writePublicAssets({ log, plugin, sourceDir, buildDir }: TaskContext) {
  if (!plugin.manifest.ui) {
    return;
  }

  log.info('copying assets from `public/assets` to build');

  await asyncPipeline(
    vfs.src(['public/assets/**/*'], {
      cwd: sourceDir,
      base: sourceDir,
      buffer: true,
      allowEmpty: true,
      encoding: false,
    }),
    vfs.dest(buildDir)
  );
}
