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

import { resolve } from 'path';
import { statSync } from 'fs';
import del from 'del';
import { createBuild } from '../create_build';
import { createPackage } from '../create_package';
import { pluginConfig } from '../../../lib';

const PLUGIN_FIXTURE = resolve(__dirname, '__fixtures__/create_package_test_plugin');
const PLUGIN = pluginConfig(PLUGIN_FIXTURE);
const PLUGIN_BUILD_DIR = resolve(PLUGIN_FIXTURE, 'build-custom');

const buildVersion = PLUGIN.version;
const kibanaVersion = PLUGIN.version;
const buildFiles = PLUGIN.buildSourcePatterns;
const packageFile = `${PLUGIN.id}-${buildVersion}.zip`;

beforeAll(() => del(PLUGIN_BUILD_DIR));
afterAll(() => del(PLUGIN_BUILD_DIR));

describe('creating the package', () => {
  it('creates zip file in build target path', async () => {
    await createBuild(PLUGIN, PLUGIN_BUILD_DIR, buildVersion, kibanaVersion, buildFiles);
    await createPackage(PLUGIN, PLUGIN_BUILD_DIR, buildVersion);

    const zipFile = resolve(PLUGIN_BUILD_DIR, packageFile);
    const stats = statSync(zipFile);
    expect(stats.isFile()).toBe(true);
  });
});
