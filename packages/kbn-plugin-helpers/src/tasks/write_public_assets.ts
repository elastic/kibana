/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { pipeline } from 'stream/promises';

import vfs from 'vinyl-fs';

import { BuildContext } from '../build_context';

export async function writePublicAssets({ log, plugin, sourceDir, buildDir }: BuildContext) {
  if (!plugin.manifest.ui) {
    return;
  }

  log.info('copying assets from `public/assets` to build');

  await pipeline(
    vfs.src(['public/assets/**/*'], {
      cwd: sourceDir,
      base: sourceDir,
      buffer: true,
      allowEmpty: true,
    }),
    vfs.dest(buildDir)
  );
}
