/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fsp from 'fs/promises';
import { cpus } from 'os';
import Path from 'path';
import { promisify } from 'util';

import del from 'del';
import { globby } from 'globby';
import zlib from 'zlib';
import { REPO_ROOT } from '@kbn/repo-info';
import { asyncForEachWithLimit } from '@kbn/std';

import type { TaskContext } from '../task_context';

const brotliCompressAsync = promisify(zlib.brotliCompress);
// each pending brotliCompress call holds a quality-11 encoder, so unbounded concurrency balloons memory
const PARALLEL_CONCURRENCY = cpus().length;

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
    const files = await globby(['**/*.{js,css}'], { cwd: compressDir, absolute: true });
    await asyncForEachWithLimit(files, PARALLEL_CONCURRENCY, compressFile);
  } catch (e) {
    log.error(e);
  }
}

async function compressFile(file: string) {
  const compressed = await brotliCompressAsync(await Fsp.readFile(file), {
    params: {
      [zlib.constants.BROTLI_PARAM_QUALITY]: zlib.constants.BROTLI_MAX_QUALITY,
    },
  });
  await Fsp.writeFile(`${file}.br`, compressed);
}
