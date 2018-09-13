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

const resolve = require('path').resolve;
const fs = require('fs');
const del = require('del');

const PLUGIN_FIXTURE = resolve(__dirname, '__fixtures__/build_action_test_plugin');
const PLUGIN_BUILD_DIR = resolve(PLUGIN_FIXTURE, 'build');
const PLUGIN = require('../../../lib/plugin_config')(PLUGIN_FIXTURE);
const noop = () => {};

describe('creating build zip', () => {
  const buildAction = require('../build_action');

  beforeEach(() => del(PLUGIN_BUILD_DIR));
  afterEach(() => del(PLUGIN_BUILD_DIR));

  it('creates a zip in the build directory', async () => {
    await buildAction(PLUGIN);

    const buildFile = resolve(PLUGIN_BUILD_DIR, PLUGIN.id + '-' + PLUGIN.version + '.zip');
    if (!fs.existsSync(buildFile)) {
      throw new Error('Build file not found: ' + buildFile);
    }
  });

  it('skips zip creation based on flag', async () => {
    await buildAction(PLUGIN, noop, { skipArchive: true });

    const buildFile = resolve(PLUGIN_BUILD_DIR, PLUGIN.id + '-' + PLUGIN.version + '.zip');
    if (fs.existsSync(buildFile)) {
      throw new Error('Build file not found: ' + buildFile);
    }
  });
});

describe('calling create_build', () => {
  let mockBuild;
  let buildAction;

  beforeEach(() => {
    jest.resetModules();
    mockBuild = jest.fn(() => Promise.resolve());
    jest.mock('../create_build', () => mockBuild);
    buildAction = require('../build_action');
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

    await buildAction(PLUGIN, noop, options);

    expect(mockBuild.mock.calls).toHaveLength(1);

    const { buildVersion, kibanaVersion } = nameArgs(mockBuild.mock.calls[0]);
    expect(buildVersion).toBe('1.2.3');
    expect(kibanaVersion).toBe('4.5.6');
  });

  it('uses default file list without files option', async () => {
    await buildAction(PLUGIN);

    expect(mockBuild.mock.calls).toHaveLength(1);

    const { files } = nameArgs(mockBuild.mock.calls[0]);
    PLUGIN.buildSourcePatterns.forEach(file => expect(files).toContain(file));
  });

  it('uses only files passed in', async () => {
    const options = {
      files: ['index.js', 'LICENSE.txt', 'plugins/**/*', '{server,public}/**/*'],
    };

    await buildAction(PLUGIN, noop, options);

    expect(mockBuild.mock.calls).toHaveLength(1);

    const { files } = nameArgs(mockBuild.mock.calls[0]);
    options.files.forEach(file => expect(files).toContain(file));
  });

  it('rejects returned promise when build fails', async () => {
    mockBuild.mockImplementation(async () => {
      throw new Error('foo bar');
    });

    await expect(buildAction(PLUGIN, noop)).rejects.toThrowErrorMatchingSnapshot();
  });
});
