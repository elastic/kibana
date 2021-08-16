/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { resolve, basename } from 'path';
import { createHash } from 'crypto';
import { promisify } from 'util';
import { pipeline, Transform } from 'stream';
import Fs from 'fs';

import getopts from 'getopts';
import del from 'del';

import { buildSnapshot, log } from '../utils';

const pipelineAsync = promisify(pipeline);

export const description = 'Build and collect ES snapshots';

export const help = () => ``;

export const run = async (defaults = {}) => {
  const argv = process.argv.slice(2);
  const options = getopts(argv, {
    alias: {
      sourcePath: 'source-path',
    },
    default: {
      ...defaults,
      output: 'es_snapshots',
    },
  });

  const outputDir = resolve(process.cwd(), options.output);
  del.sync(outputDir);
  Fs.mkdirSync(outputDir, { recursive: true });

  for (const license of ['oss', 'trial'] as const) {
    for (const platform of ['darwin', 'win32', 'linux'] as const) {
      log.info('Building', platform, license === 'trial' ? 'default' : 'oss', 'snapshot');
      log.indent(4);

      const snapshotPath = await buildSnapshot({
        license,
        sourcePath: options.sourcePath,
        log,
        platform,
      });

      const filename = basename(snapshotPath);
      const outputPath = resolve(outputDir, filename);
      const hash = createHash('sha512');
      await pipelineAsync(
        Fs.createReadStream(snapshotPath),
        new Transform({
          transform(chunk, _, cb) {
            hash.update(chunk);
            cb(undefined, chunk);
          },
        }),
        Fs.createWriteStream(outputPath)
      );

      Fs.writeFileSync(`${outputPath}.sha512`, `${hash.digest('hex')}  ${filename}`);
      log.success('snapshot and shasum written to', outputPath);
      log.indent(-4);
    }
  }
};
