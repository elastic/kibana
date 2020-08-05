/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

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

exports.help = () => ``;

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
