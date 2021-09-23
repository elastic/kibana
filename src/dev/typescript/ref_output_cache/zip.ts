/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Fs from 'fs/promises';
import { createWriteStream } from 'fs';
import Path from 'path';
import { pipeline } from 'stream';
import { promisify } from 'util';

import archiver from 'archiver';

const asyncPipeline = promisify(pipeline);

export async function zip(
  dirs: Array<[string, string]>,
  files: Array<[string, string]>,
  outputPath: string
) {
  const archive = archiver('zip', {
    zlib: {
      level: 9,
    },
  });

  for (const [absolute, relative] of dirs) {
    archive.directory(absolute, relative);
  }

  for (const [absolute, relative] of files) {
    archive.file(absolute, {
      name: relative,
    });
  }

  // ensure output dir exists
  await Fs.mkdir(Path.dirname(outputPath), { recursive: true });

  // await the promise from the pipeline and archive.finalize()
  await Promise.all([asyncPipeline(archive, createWriteStream(outputPath)), archive.finalize()]);
}
