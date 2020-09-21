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
const fs = require('fs');
const supportsColor = require('supports-color');
const { run } = require('@kbn/dev-utils');

const TARGET_BUILD_DIR = path.resolve(__dirname, '../target');
const ROOT_DIR = path.resolve(__dirname, '../');
const WORKER_PATH_SECTION = 'ace/modes/x_json/worker/x_json.ace.worker.js';

run(
  async ({ procRunner, log }) => {
    log.info('Deleting old output');

    await del(TARGET_BUILD_DIR);

    const cwd = ROOT_DIR;
    const env = { ...process.env };

    if (supportsColor.stdout) {
      env.FORCE_COLOR = 'true';
    }

    await procRunner.run('tsc   ', {
      cmd: 'tsc',
      args: [],
      wait: true,
      env,
      cwd,
    });

    log.success('Copying worker file to target.');

    fs.copyFileSync(
      path.resolve(__dirname, '..', 'src', WORKER_PATH_SECTION),
      path.resolve(__dirname, '..', 'target', WORKER_PATH_SECTION)
    );

    log.success('Complete');
  },
  {
    flags: {
      boolean: ['dev'],
    },
  }
);
