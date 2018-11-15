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

const mockPackage = new Proxy({ raw: {} as any }, { get: (obj, prop) => obj.raw[prop] });
jest.mock('../../../utils/package_json', () => ({ pkg: mockPackage }));

const mockDiscover = jest.fn();
jest.mock('./discovery/plugins_discovery', () => ({ discover: mockDiscover }));

import { BehaviorSubject, from } from 'rxjs';

import { Config, ConfigService, Env, ObjectToConfigAdapter } from '../config';
import { getEnvOptions } from '../config/__mocks__/env';
import { logger } from '../logging/__mocks__';
import { PluginDiscoveryError } from './discovery/plugin_discovery_error';
import { PluginsService } from './plugins_service';

let pluginsService: PluginsService;
let configService: ConfigService;
let env: Env;
beforeEach(() => {
  mockPackage.raw = {
    branch: 'feature-v1',
    version: 'v1',
    build: {
      distributable: true,
      number: 100,
      sha: 'feature-v1-build-sha',
    },
  };

  env = Env.createDefault(getEnvOptions());

  configService = new ConfigService(
    new BehaviorSubject<Config>(
      new ObjectToConfigAdapter({
        plugins: {
          initialize: true,
          scanDirs: ['one', 'two'],
          paths: ['three', 'four'],
        },
      })
    ),
    env,
    logger
  );
  pluginsService = new PluginsService(env, logger, configService);
});

afterEach(() => {
  jest.clearAllMocks();
});

test('properly invokes `discover` on `start`.', async () => {
  mockDiscover.mockReturnValue({
    error$: from([
      PluginDiscoveryError.invalidManifest('path-1', new Error('Invalid JSON')),
      PluginDiscoveryError.missingManifest('path-2', new Error('No manifest')),
      PluginDiscoveryError.invalidScanDirectory('dir-1', new Error('No dir')),
      PluginDiscoveryError.incompatibleVersion('path-3', new Error('Incompatible version')),
    ]),

    plugin$: from([
      {
        path: 'path-4',
        manifest: {
          id: 'some-id',
          version: 'some-version',
          kibanaVersion: '7.0.0',
          requiredPlugins: ['some-required-plugin', 'some-required-plugin-2'],
          optionalPlugins: ['some-optional-plugin'],
          ui: true,
        },
      },
      {
        path: 'path-5',
        manifest: {
          id: 'some-other-id',
          version: 'some-other-version',
          kibanaVersion: '7.0.0',
          requiredPlugins: ['some-required-plugin'],
          optionalPlugins: [],
          ui: false,
        },
      },
    ]),
  });

  await pluginsService.start();

  expect(mockDiscover).toHaveBeenCalledTimes(1);
  expect(mockDiscover).toHaveBeenCalledWith(
    { initialize: true, paths: ['three', 'four'], scanDirs: ['one', 'two'] },
    { branch: 'feature-v1', buildNum: 100, buildSha: 'feature-v1-build-sha', version: 'v1' },
    expect.objectContaining({
      debug: expect.any(Function),
      error: expect.any(Function),
      info: expect.any(Function),
    })
  );

  expect(logger.mockCollect()).toMatchInlineSnapshot(`
Object {
  "debug": Array [
    Array [
      "starting plugins service",
    ],
    Array [
      "Marking config path as handled: plugins",
    ],
    Array [
      "Discovered 2 plugins.",
    ],
  ],
  "error": Array [
    Array [
      [Error: Invalid JSON (invalid-manifest, path-1)],
    ],
    Array [
      [Error: Incompatible version (incompatible-version, path-3)],
    ],
  ],
  "fatal": Array [],
  "info": Array [],
  "log": Array [],
  "trace": Array [],
  "warn": Array [],
}
`);
});
