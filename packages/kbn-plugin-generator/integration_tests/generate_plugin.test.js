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

import { spawn } from 'child_process';
import Fs from 'fs';
import { resolve } from 'path';
import { promisify } from 'util';

import del from 'del';
import { snakeCase } from 'lodash';

const statAsync = promisify(Fs.stat);
const ROOT_DIR = resolve(__dirname, '../../../');

const pluginName = 'ispec-plugin';
const snakeCased = snakeCase(pluginName);
const generatedPath = resolve(ROOT_DIR, `plugins/${snakeCased}`);

beforeAll(async () => {
  await del(generatedPath, { force: true });
});

afterAll(async () => {
  await del(generatedPath, { force: true });
});

it('generates a plugin', async () => {
  await new Promise((resolve, reject) => {
    const proc = spawn(process.execPath, ['scripts/generate_plugin.js', pluginName], {
      cwd: ROOT_DIR,
      stdio: 'pipe',
    });

    proc.stdout.on('data', function selectDefaults() {
      proc.stdin.write('\n'); // Generate a plugin with default options.
    });

    proc.on('close', resolve);
    proc.on('error', reject);
  });

  const stats = await statAsync(generatedPath);
  if (!stats.isDirectory()) {
    throw new Error(`Expected [${generatedPath}] to be a directory`);
  }
});
