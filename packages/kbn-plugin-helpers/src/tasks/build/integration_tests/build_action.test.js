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
import fs from 'fs';
import del from 'del';
import { pluginConfig } from '../../../lib';

const PLUGIN_FIXTURE = resolve(__dirname, '__fixtures__/build_action_test_plugin');
const PLUGIN_BUILD_DIR = resolve(PLUGIN_FIXTURE, 'build');
const plugin = pluginConfig(PLUGIN_FIXTURE);

describe('creating build zip', () => {
  const { buildTask } = require('../build_task');

  beforeEach(() => del(PLUGIN_BUILD_DIR));
  afterEach(() => del(PLUGIN_BUILD_DIR));

  it('creates a zip in the build directory', async () => {
    await buildTask({ plugin });

    const buildFile = resolve(PLUGIN_BUILD_DIR, plugin.id + '-' + plugin.version + '.zip');
    if (!fs.existsSync(buildFile)) {
      throw new Error('Build file not found: ' + buildFile);
    }
  });

  it('skips zip creation based on flag', async () => {
    await buildTask({ plugin, options: { skipArchive: true } });

    const buildFile = resolve(PLUGIN_BUILD_DIR, plugin.id + '-' + plugin.version + '.zip');
    if (fs.existsSync(buildFile)) {
      throw new Error('Build file not found: ' + buildFile);
    }
  });
});

describe('calling create_build', () => {
  let mockBuild;
  let buildTask;

  beforeEach(() => {
    jest.resetModules();
    jest.mock('../create_build');
    ({ createBuild: mockBuild } = require('../create_build'));
    ({ buildTask } = require('../build_task'));
  });

  const nameArgs = ([plugin, buildTarget, buildVersion, kibanaVersion, files]) => ({
    plugin,
    buildTarget,
    buildVersion,
    kibanaVersion,
    files,
  });

  it('takes optional build version', async () => {
    const options = {
      buildVersion: '1.2.3',
      kibanaVersion: '4.5.6',
    };

    await buildTask({ plugin, options });

    expect(mockBuild.mock.calls).toHaveLength(1);

    const { buildVersion, kibanaVersion } = nameArgs(mockBuild.mock.calls[0]);
    expect(buildVersion).toBe('1.2.3');
    expect(kibanaVersion).toBe('4.5.6');
  });

  it('uses default file list without files option', async () => {
    await buildTask({ plugin });

    expect(mockBuild.mock.calls).toHaveLength(1);

    const { files } = nameArgs(mockBuild.mock.calls[0]);
    plugin.buildSourcePatterns.forEach((file) => expect(files).toContain(file));
  });

  it('uses only files passed in', async () => {
    const options = {
      files: ['index.js', 'LICENSE.txt', 'plugins/**/*', '{server,public}/**/*'],
    };

    await buildTask({ plugin, options });

    expect(mockBuild.mock.calls).toHaveLength(1);

    const { files } = nameArgs(mockBuild.mock.calls[0]);
    options.files.forEach((file) => expect(files).toContain(file));
  });

  it('rejects returned promise when build fails', async () => {
    mockBuild.mockImplementation(async () => {
      throw new Error('foo bar');
    });

    await expect(buildTask({ plugin })).rejects.toThrowErrorMatchingSnapshot();
  });
});
