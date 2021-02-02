/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { pipeline } from 'stream';
import { promisify } from 'util';

import vfs from 'vinyl-fs';

import { BuildContext } from '../build_context';

const asyncPipeline = promisify(pipeline);

export async function writePublicAssets({ log, plugin, sourceDir, buildDir }: BuildContext) {
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
    }),
    vfs.dest(buildDir)
  );
}
