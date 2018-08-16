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

import { spawnSync } from 'child_process';
import { resolve } from 'path';

const ROOT_DIR = resolve(__dirname, '../../../../');
const INVALID_CONFIG_PATH = resolve(__dirname, '__fixtures__/fatal_metadata.yml');

describe('fatal error', function () {
  it('logs no metadata', function () {
    const { stdout } = spawnSync(process.execPath, [
      'src/cli',
      '--config', INVALID_CONFIG_PATH
    ], {
      cwd: ROOT_DIR
    });

    const logLines = stdout.toString('utf8')
      .split('\n')
      .map(l => {
        try {
          return JSON.parse(l);
        } catch(e) {
          return;
        }
      })
      .filter(Boolean)
      .map(obj => {
        // contains system dependent paths
        delete obj.error.stack;

        return ({
          ...obj,
          pid: '## PID ##',
          '@timestamp': '## @timestamp ##'
        });
      });

    expect(logLines).toMatchSnapshot();
  }, 20 * 1000);
});
