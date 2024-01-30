/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import { pipeline } from 'stream';
import { promisify } from 'util';

import vfs from 'vinyl-fs';
import del from 'del';
import gulpBrotli from 'gulp-brotli';
import zlib from 'zlib';
import { REPO_ROOT } from '@kbn/repo-info';

import { TaskContext } from '../task_context';

const asyncPipeline = promisify(pipeline);

export async function brotliCompressBundles({ buildDir, log, plugin }: TaskContext) {
  if (!plugin.manifest.ui) {
    return;
  }

  const compressDir = Path.resolve(buildDir, 'target/public');

  log.info(
    `compressing js and css bundles found at ${Path.relative(REPO_ROOT, compressDir)} to brotli`
  );

  try {
    await del(['**/*.br'], { cwd: compressDir });
    await asyncPipeline(
      vfs.src(['**/*.{js,css}'], { cwd: compressDir }),
      gulpBrotli({
        params: {
          [zlib.constants.BROTLI_PARAM_QUALITY]: zlib.constants.BROTLI_MAX_QUALITY,
        },
      }),
      vfs.dest(compressDir)
    );
  } catch (e) {
    log.error(e);
  }
}
