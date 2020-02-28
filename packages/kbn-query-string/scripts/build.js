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

const { resolve } = require('path');

const del = require('del');
const { run, withProcRunner } = require('@kbn/dev-utils');

const KIBANA_ROOT = resolve(__dirname, '../../../');
const ROOT_DIR = resolve(__dirname, '..');
const SOURCE_DIR = resolve(ROOT_DIR, 'src');
const BUILD_DIR = resolve(ROOT_DIR, 'target');

const padRight = (width, str) =>
  str.length >= width ? str : `${str}${' '.repeat(width - str.length)}`;

run(
  async ({ log }) => {
    await withProcRunner(log, async proc => {
      log.info('Deleting old output');
      await del(BUILD_DIR);
      await del(`${SOURCE_DIR}/index.js`);

      const cwd = ROOT_DIR;
      const env = { ...process.env };

      log.info(`Copying JS`);
      await proc.run(padRight(10, `js:copy`), {
        cmd: 'cp',
        args: [resolve(KIBANA_ROOT, 'node_modules/query-string/index.js'), resolve(SOURCE_DIR)],
        wait: true,
        cwd,
      });

      log.info(`Starting babel`);
      await Promise.all([
        ...['web', 'node'].map(subTask =>
          proc.run(padRight(10, `babel:${subTask}`), {
            cmd: 'babel',
            args: [
              'src',
              '--config-file',
              require.resolve('../babel.config.js'),
              '--out-dir',
              resolve(BUILD_DIR, subTask),
              '--extensions',
              '.js',
            ],
            wait: true,
            env: {
              ...env,
              BABEL_ENV: subTask,
            },
            cwd,
          })
        ),
      ]);

      log.info(`Copying TS`);
      await proc.run(padRight(10, `ts:create_dir`), {
        cmd: 'mkdir',
        args: ['-p', resolve(BUILD_DIR, 'types')],
        wait: true,
        cwd,
      });

      await proc.run(padRight(10, `ts:copy`), {
        cmd: 'cp',
        args: [
          resolve(KIBANA_ROOT, 'node_modules/query-string/index.d.ts'),
          resolve(BUILD_DIR, 'types/index.d.ts'),
        ],
        wait: true,
        cwd,
      });

      log.info(`Cleaning up`);
      await del(`${SOURCE_DIR}/index.js`);

      log.success('Complete');
    });
  },
  {
    description: 'Simple build tool for @kbn/query-string package',
  }
);
