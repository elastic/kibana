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

/* eslint-disable no-restricted-syntax */
import { spawn } from 'child_process';
import { resolve } from 'path';
import { promises as fsP } from 'fs';
import { snakeCase } from 'lodash';
import * as del from 'del';

const ROOT_DIR = resolve(__dirname, '../../../');
const oneMinute = 60000;

describe('running the plugin-generator', () => {
  const pluginName = 'ispec-plugin';
  const snakeCased = snakeCase(pluginName);
  const generatedPath = resolve(ROOT_DIR, `plugins/${snakeCased}`);
  const currentlyFailing = ['lint', 'test:browser', 'test:mocha'];
  // eslint-disable-next-line no-undef
  beforeAll(done => {
    const create = spawn(process.execPath, ['scripts/generate_plugin.js', pluginName], {
      cwd: ROOT_DIR,
    });
    create.stdout.on('data', () => {
      create.stdin.write('\n');
    });
    create.on('close', done);
  }, oneMinute);

  // eslint-disable-next-line no-undef
  afterAll(() => {
    del.sync(generatedPath, { force: true });
  }, oneMinute);

  it(`should succeed on creating a plugin in a directory named ${snakeCased}`, async () => {
    const stats = await fsP.stat(generatedPath);
    // eslint-disable-next-line no-undef
    expect(stats.isDirectory()).toBe(true);
  });

  currentlyFailing.forEach(x => {
    it(
      `should fail on 'yarn ${x}' within the plugin's root dir`,
      done => {
        console.log(`\n### Testing 'yarn ${x}'`);
        const yarnCmd = spawn('yarn', [x], { cwd: generatedPath });
        yarnCmd.stderr.on('data', data => {
          // eslint-disable-next-line no-undef
          expect(data.includes('Error:'));
        });
        yarnCmd.on('close', data => {
          // eslint-disable-next-line no-undef
          expect(data).not.toBe(0); // Not exit code 0
          done();
        });
      },
      oneMinute * 3
    );
  });
});
