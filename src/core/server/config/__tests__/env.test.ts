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

jest.mock('process', () => ({
  cwd() {
    return '/test/cwd';
  },
}));

jest.mock('path', () => ({
  resolve(...pathSegments: string[]) {
    return pathSegments.join('/');
  },
}));

import { Env } from '../env';

test('correctly creates default environment with empty options.', () => {
  const defaultEnv = Env.createDefault({});

  expect(defaultEnv.homeDir).toEqual('/test/cwd');
  expect(defaultEnv.configDir).toEqual('/test/cwd/config');
  expect(defaultEnv.corePluginsDir).toEqual('/test/cwd/core_plugins');
  expect(defaultEnv.binDir).toEqual('/test/cwd/bin');
  expect(defaultEnv.logDir).toEqual('/test/cwd/log');
  expect(defaultEnv.staticFilesDir).toEqual('/test/cwd/ui');

  expect(defaultEnv.getConfigFile()).toEqual('/test/cwd/config/kibana.yml');
  expect(defaultEnv.getLegacyKbnServer()).toBeUndefined();
});

test('correctly creates default environment with options overrides.', () => {
  const kbnServerMock = {};
  const defaultEnv = Env.createDefault({
    config: '/some/other/path/some-kibana.yml',
    kbnServer: kbnServerMock,
  });

  expect(defaultEnv.homeDir).toEqual('/test/cwd');
  expect(defaultEnv.configDir).toEqual('/test/cwd/config');
  expect(defaultEnv.corePluginsDir).toEqual('/test/cwd/core_plugins');
  expect(defaultEnv.binDir).toEqual('/test/cwd/bin');
  expect(defaultEnv.logDir).toEqual('/test/cwd/log');
  expect(defaultEnv.staticFilesDir).toEqual('/test/cwd/ui');

  expect(defaultEnv.getConfigFile()).toEqual(
    '/some/other/path/some-kibana.yml'
  );
  expect(defaultEnv.getLegacyKbnServer()).toBe(kbnServerMock);
});

test('correctly creates environment with constructor.', () => {
  const defaultEnv = new Env('/some/home/dir', {
    config: '/some/other/path/some-kibana.yml',
  });

  expect(defaultEnv.homeDir).toEqual('/some/home/dir');
  expect(defaultEnv.configDir).toEqual('/some/home/dir/config');
  expect(defaultEnv.corePluginsDir).toEqual('/some/home/dir/core_plugins');
  expect(defaultEnv.binDir).toEqual('/some/home/dir/bin');
  expect(defaultEnv.logDir).toEqual('/some/home/dir/log');
  expect(defaultEnv.staticFilesDir).toEqual('/some/home/dir/ui');

  expect(defaultEnv.getConfigFile()).toEqual(
    '/some/other/path/some-kibana.yml'
  );
  expect(defaultEnv.getLegacyKbnServer()).toBeUndefined();
});
