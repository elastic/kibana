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

const getopts = require('getopts');
const del = require('del');
const supportsColor = require('supports-color');
const { ToolingLog, withProcRunner, pickLevelFromFlags } = require('@kbn/dev-utils');

const ROOT_DIR = resolve(__dirname, '..');
const BUILD_DIR = resolve(ROOT_DIR, 'target');

const padRight = (width, str) =>
  str.length >= width ? str : `${str}${' '.repeat(width - str.length)}`;

const unknownFlags = [];
const flags = getopts(process.argv, {
  boolean: ['watch', 'help', 'source-maps'],
  unknown(name) {
    unknownFlags.push(name);
  },
});

const log = new ToolingLog({
  level: pickLevelFromFlags(flags),
  writeTo: process.stdout,
});

if (unknownFlags.length) {
  log.error(`Unknown flag(s): ${unknownFlags.join(', ')}`);
  flags.help = true;
  process.exitCode = 1;
}

if (flags.help) {
  log.info(`
    Simple build tool for @kbn/es-query package

    --watch       Run in watch mode
    --source-maps Include sourcemaps
    --help        Show this message
  `);
  process.exit();
}

withProcRunner(log, async proc => {
  log.info('Deleting old output');
  await del(BUILD_DIR);

  const cwd = ROOT_DIR;
  const env = { ...process.env };
  if (supportsColor.stdout) {
    env.FORCE_COLOR = 'true';
  }

  log.info(`Starting babel and typescript${flags.watch ? ' in watch mode' : ''}`);
  await Promise.all([
    ...['public', 'server'].map(subTask =>
      proc.run(padRight(12, `babel:${subTask}`), {
        cmd: 'babel',
        args: [
          'src',
          '--config-file',
          require.resolve('../babel.config.js'),
          '--out-dir',
          resolve(BUILD_DIR, subTask),
          '--extensions',
          '.js,.ts,.tsx',
          ...(flags.watch ? ['--watch'] : ['--quiet']),
          ...(flags['source-maps'] ? ['--source-map', 'inline'] : []),
        ],
        wait: true,
        cwd,
        env: {
          ...env,
          BABEL_ENV: subTask,
        },
      })
    ),
  ]);

  log.success('Complete');
}).catch(error => {
  log.error(error);
  process.exit(1);
});
