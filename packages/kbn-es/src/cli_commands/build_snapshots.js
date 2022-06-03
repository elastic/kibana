/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const dedent = require('dedent');
const { resolve, basename } = require('path');
const { createHash } = require('crypto');
const { promisify } = require('util');
const { pipeline, Transform } = require('stream');
const Fs = require('fs');

const getopts = require('getopts');
const del = require('del');

const { buildSnapshot, log } = require('../utils');

const pipelineAsync = promisify(pipeline);

exports.description = 'Build and collect ES snapshots';

exports.help = () => dedent`
    Options:

      --output          Path to create the built elasticsearch snapshots
      --source-path     Path where the elasticsearch repository is checked out

    Example:

      es build_snapshots --source-path=/path/to/es/checked/repo --output=/tmp/es-built-snapshots
  `;

exports.run = async (defaults = {}) => {
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

  for (const license of ['oss', 'trial']) {
    for (const platform of ['darwin', 'win32', 'linux']) {
      log.info('Building', platform, license === 'trial' ? 'default' : 'oss', 'snapshot');
      await log.indent(4, async () => {
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
      });
    }
  }
};
