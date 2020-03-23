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
const supportsColor = require('supports-color');
const { run, withProcRunner } = require('@kbn/dev-utils');

const ROOT_DIR = resolve(__dirname, '..');
const BUILD_DIR = resolve(ROOT_DIR, 'target');

const padRight = (width, str) =>
  str.length >= width ? str : `${str}${' '.repeat(width - str.length)}`;

run(
  async ({ log, flags }) => {
    await withProcRunner(log, async proc => {
      log.info('Deleting old output');
      await del(BUILD_DIR);

      const cwd = ROOT_DIR;
      const env = { ...process.env };
      if (supportsColor.stdout) {
        env.FORCE_COLOR = 'true';
      }

      log.info(`Starting babel and typescript${flags.watch ? ' in watch mode' : ''}`);
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
              '.ts,.js,.tsx',
              ...(flags.watch ? ['--watch'] : ['--quiet']),
              ...(!flags['source-maps'] || !!process.env.CODE_COVERAGE
                ? []
                : ['--source-maps', 'inline']),
            ],
            wait: true,
            env: {
              ...env,
              BABEL_ENV: subTask,
            },
            cwd,
          })
        ),

        proc.run(padRight(10, 'tsc'), {
          cmd: 'tsc',
          args: [
            '--emitDeclarationOnly',
            ...(flags.watch ? ['--watch', '--preserveWatchOutput', 'true'] : []),
            ...(flags['source-maps'] ? ['--declarationMap', 'true'] : []),
          ],
          wait: true,
          env,
          cwd,
        }),
      ]);

      log.success('Complete');
    });
  },
  {
    description: 'Simple build tool for @kbn/i18n package',
    flags: {
      boolean: ['watch', 'source-maps'],
      help: `
        --watch            Run in watch mode
        --source-maps      Include sourcemaps
      `,
    },
  }
);
