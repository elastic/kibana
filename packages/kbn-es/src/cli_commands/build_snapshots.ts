/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import dedent from 'dedent';
import { resolve, basename } from 'path';
import { createHash } from 'crypto';
import { promisify } from 'util';
import { pipeline, Transform } from 'stream';
import Fs from 'fs';

import getopts from 'getopts';
import del from 'del';

import { buildSnapshot, log } from '../utils';
import { Command } from './types';

const pipelineAsync = promisify(pipeline);

export const buildSnapshots: Command = {
  description: 'Build and collect ES snapshots',
  help: () => dedent`
    Options:

      --output          Path to create the built elasticsearch snapshots
      --source-path     Path where the elasticsearch repository is checked out

    Example:

      es build_snapshots --source-path=/path/to/es/checked/repo --output=/tmp/es-built-snapshots
  `,
  run: async (defaults = {}) => {
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

    for (const platform of ['darwin', 'win32', 'linux']) {
      log.info('Building', platform, 'default snapshot');
      await log.indent(4, async () => {
        const snapshotPath = await buildSnapshot({
          license: 'trial',
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
      });
    }
  },
};
