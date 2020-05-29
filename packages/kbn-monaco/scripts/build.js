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

const path = require('path');
const del = require('del');
const getopts = require('getopts');
const supportsColor = require('supports-color');
const { ToolingLog, withProcRunner, pickLevelFromFlags } = require('@kbn/dev-utils');

const TARGET_BUILD_DIR = path.resolve(__dirname, '../target');
const ROOT_DIR = path.resolve(__dirname, '../');
const WEBPACK_CONFIG_PATH = path.resolve(ROOT_DIR, 'webpack.config.js');

const flags = getopts(process.argv, {
  boolean: ['dev'],
});

const log = new ToolingLog({
  level: pickLevelFromFlags(flags),
  writeTo: process.stdout,
});

withProcRunner(log, async (proc) => {
  log.info('Deleting old output');

  await del(TARGET_BUILD_DIR);

  const cwd = ROOT_DIR;
  const env = { ...process.env };
  if (supportsColor.stdout) {
    env.FORCE_COLOR = 'true';
  }

  await proc.run('webpack  ', {
    cmd: 'webpack',
    args: ['--config', WEBPACK_CONFIG_PATH, flags.dev ? '--env.dev' : '--env.prod'],
    wait: true,
    env,
    cwd,
  });

  await proc.run('tsc  ', {
    cmd: 'tsc',
    args: ['--emitDeclarationOnly'],
    wait: true,
    env,
    cwd,
  });

  log.success('Complete');
}).catch((error) => {
  log.error(error);
  process.exit(1);
});
