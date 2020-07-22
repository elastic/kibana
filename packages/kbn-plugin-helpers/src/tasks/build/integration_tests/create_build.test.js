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
import { readdirSync, existsSync, unlinkSync } from 'fs';
import del from 'del';
import { createBuild } from '../create_build';
import { pluginConfig } from '../../../lib';

const PLUGIN_FIXTURE = resolve(__dirname, '__fixtures__/create_build_test_plugin');
const PLUGIN = pluginConfig(PLUGIN_FIXTURE);
const PLUGIN_BUILD_DIR = resolve(PLUGIN_FIXTURE, 'build');
const PLUGIN_BUILD_TARGET = resolve(PLUGIN_BUILD_DIR, 'kibana', PLUGIN.id);

beforeEach(() => del(PLUGIN_BUILD_DIR));
afterEach(() => del(PLUGIN_BUILD_DIR));

describe('creating the build', () => {
  const buildTarget = resolve(PLUGIN.root, 'build');
  const buildVersion = PLUGIN.version;
  const kibanaVersion = PLUGIN.version;
  const buildFiles = PLUGIN.buildSourcePatterns;

  it('removes development properties from package.json', async () => {
    expect(PLUGIN.pkg.scripts).not.toBeUndefined();
    expect(PLUGIN.pkg.devDependencies).not.toBeUndefined();

    await createBuild(PLUGIN, buildTarget, buildVersion, kibanaVersion, buildFiles);

    const pkg = require(resolve(PLUGIN_BUILD_TARGET, 'package.json')); // eslint-disable-line import/no-dynamic-require
    expect(pkg).not.toHaveProperty('scripts');
    expect(pkg).not.toHaveProperty('devDependencies');
  });

  it('adds build metadata to package.json', async () => {
    expect(PLUGIN.pkg.build).toBeUndefined();

    await createBuild(PLUGIN, buildTarget, buildVersion, kibanaVersion, buildFiles);

    const pkg = require(resolve(PLUGIN_BUILD_TARGET, 'package.json')); // eslint-disable-line import/no-dynamic-require
    expect(pkg).toHaveProperty('build');
    expect(pkg.build.git).not.toBeUndefined();
    expect(pkg.build.date).not.toBeUndefined();
  });

  describe('skipInstallDependencies = false', () => {
    it('installs node_modules as a part of build', async () => {
      expect(PLUGIN.skipInstallDependencies).toBe(false);

      await createBuild(PLUGIN, buildTarget, buildVersion, kibanaVersion, buildFiles);

      expect(readdirSync(resolve(PLUGIN_BUILD_TARGET))).toContain('node_modules');
      expect(readdirSync(resolve(PLUGIN_BUILD_TARGET, 'node_modules'))).toContain('noop3');
    });
  });

  describe('skipInstallDependencies = true', () => {
    // set skipInstallDependencies to true for these tests
    beforeEach(() => (PLUGIN.skipInstallDependencies = true));
    // set it back to false after
    afterEach(() => (PLUGIN.skipInstallDependencies = false));

    it('does not install node_modules as a part of build', async () => {
      expect(PLUGIN.skipInstallDependencies).toBe(true);

      await createBuild(PLUGIN, buildTarget, buildVersion, kibanaVersion, buildFiles);

      expect(readdirSync(resolve(PLUGIN_BUILD_TARGET))).not.toContain('node_modules');
    });
  });

  describe('with styleSheetToCompile', () => {
    const sassPath = 'public/styles.scss';
    const cssPath = resolve(PLUGIN_BUILD_TARGET, 'public/styles.css');

    beforeEach(() => {
      PLUGIN.skipInstallDependencies = true;
      PLUGIN.styleSheetToCompile = sassPath;
    });

    afterEach(() => {
      PLUGIN.skipInstallDependencies = false;
      PLUGIN.styleSheetToCompile = undefined;
      unlinkSync(cssPath);
    });

    it('produces CSS', async () => {
      expect(PLUGIN.styleSheetToCompile).toBe(sassPath);

      await createBuild(PLUGIN, buildTarget, buildVersion, kibanaVersion, buildFiles);

      expect(existsSync(cssPath)).toBe(true);
    });
  });
});
