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

import { mockPackage, mockReaddir, mockReadFile, mockStat } from './plugin_discovery.test.mocks';

import { resolve } from 'path';
import { Env } from '../../config';
import { getEnvOptions } from '../../config/__mocks__/env';
import { loggingServiceMock } from '../../logging/logging_service.mock';
import { discover } from './plugins_discovery';

const TEST_PLUGIN_SEARCH_PATHS = {
  nonEmptySrcPlugins: resolve(process.cwd(), 'src', 'plugins'),
  emptyPlugins: resolve(process.cwd(), 'plugins'),
  nonExistentKibanaExtra: resolve(process.cwd(), '..', 'kibana-extra'),
};
const TEST_EXTRA_PLUGIN_PATH = resolve(process.cwd(), 'my-extra-plugin');

const pluginDefinition = {
  configDefinition: {
    schema: {
      validate: () => null,
    },
  },
};

[
  resolve(TEST_PLUGIN_SEARCH_PATHS.nonEmptySrcPlugins, '1', 'server'),
  resolve(TEST_PLUGIN_SEARCH_PATHS.nonEmptySrcPlugins, '3', 'server'),
  resolve(TEST_EXTRA_PLUGIN_PATH, 'server'),
].forEach(path => jest.doMock(path, () => pluginDefinition, { virtual: true }));

const pluginDefinitionBad = {
  configDefinition: {
    schema: {
      validate: undefined,
    },
  },
};
jest.doMock(
  resolve(TEST_PLUGIN_SEARCH_PATHS.nonEmptySrcPlugins, '6-no-schema', 'server'),
  () => pluginDefinitionBad,
  { virtual: true }
);

const logger = loggingServiceMock.create();
beforeEach(() => {
  mockReaddir.mockImplementation((path, cb) => {
    if (path === TEST_PLUGIN_SEARCH_PATHS.nonEmptySrcPlugins) {
      cb(null, [
        '1',
        '2-no-manifest',
        '3',
        '4-incomplete-manifest',
        '5-invalid-manifest',
        '6-no-schema',
        '7-non-dir',
        '8-incompatible-manifest',
        '9-inaccessible-dir',
      ]);
    } else if (path === TEST_PLUGIN_SEARCH_PATHS.nonExistentKibanaExtra) {
      cb(new Error('ENOENT'));
    } else {
      cb(null, []);
    }
  });

  mockStat.mockImplementation((path, cb) => {
    if (path.includes('9-inaccessible-dir')) {
      cb(new Error(`ENOENT (disappeared between "readdir" and "stat").`));
    } else {
      cb(null, { isDirectory: () => !path.includes('non-dir') });
    }
  });

  mockReadFile.mockImplementation((path, cb) => {
    if (path.includes('no-manifest')) {
      cb(new Error('ENOENT'));
    } else if (path.includes('invalid-manifest')) {
      cb(null, Buffer.from('not-json'));
    } else if (path.includes('incomplete-manifest')) {
      cb(null, Buffer.from(JSON.stringify({ version: '1' })));
    } else if (path.includes('incompatible-manifest')) {
      cb(null, Buffer.from(JSON.stringify({ id: 'plugin', version: '1' })));
    } else {
      cb(
        null,
        Buffer.from(
          JSON.stringify({
            id: 'plugin',
            configPath: ['core', 'config'],
            version: '1',
            kibanaVersion: '1.2.3',
            requiredPlugins: ['a', 'b'],
            optionalPlugins: ['c', 'd'],
            server: true,
          })
        )
      );
    }
  });
});

afterEach(() => {
  jest.clearAllMocks();
});

test('properly iterates through plugin search locations', async () => {
  mockPackage.raw = {
    branch: 'master',
    version: '1.2.3',
    build: {
      distributable: true,
      number: 1,
      sha: '',
    },
  };

  const env = Env.createDefault(
    getEnvOptions({
      cliArgs: { envName: 'development' },
    })
  );

  const { pluginDefinitions, errors, searchPaths, devPluginPaths } = await discover(
    Object.values(TEST_PLUGIN_SEARCH_PATHS),
    [TEST_EXTRA_PLUGIN_PATH],
    env,
    logger
  );

  expect(pluginDefinitions).toHaveLength(3);

  for (const path of [
    resolve(TEST_PLUGIN_SEARCH_PATHS.nonEmptySrcPlugins, '1'),
    resolve(TEST_PLUGIN_SEARCH_PATHS.nonEmptySrcPlugins, '3'),
    TEST_EXTRA_PLUGIN_PATH,
  ]) {
    const discoveredPlugin = pluginDefinitions.find(plugin => plugin.path === path)!;
    expect(discoveredPlugin.manifest.configPath).toEqual(['core', 'config']);
    expect(discoveredPlugin.manifest.requiredPlugins).toEqual(['a', 'b']);
    expect(discoveredPlugin.manifest.optionalPlugins).toEqual(['c', 'd']);
  }

  await expect(errors.map(String)).toEqual([
    `Error: ENOENT (missing-manifest, ${resolve(
      TEST_PLUGIN_SEARCH_PATHS.nonEmptySrcPlugins,
      '2-no-manifest',
      'kibana.json'
    )})`,
    `Error: Plugin manifest must contain an "id" property. (invalid-manifest, ${resolve(
      TEST_PLUGIN_SEARCH_PATHS.nonEmptySrcPlugins,
      '4-incomplete-manifest',
      'kibana.json'
    )})`,
    `Error: Unexpected token o in JSON at position 1 (invalid-manifest, ${resolve(
      TEST_PLUGIN_SEARCH_PATHS.nonEmptySrcPlugins,
      '5-invalid-manifest',
      'kibana.json'
    )})`,
    `Error: The config definition for plugin did not contain \"schema\" field, which is required for config validation (invalid-config-schema, ${resolve(
      TEST_PLUGIN_SEARCH_PATHS.nonEmptySrcPlugins,
      '6-no-schema',
      'server'
    )})`,
    `Error: Plugin "plugin" is only compatible with Kibana version "1", but used Kibana version is "1.2.3". (incompatible-version, ${resolve(
      TEST_PLUGIN_SEARCH_PATHS.nonEmptySrcPlugins,
      '8-incompatible-manifest',
      'kibana.json'
    )})`,
    `Error: ENOENT (invalid-search-path, ${TEST_PLUGIN_SEARCH_PATHS.nonExistentKibanaExtra})`,
  ]);

  expect(loggingServiceMock.collect(logger).warn).toMatchInlineSnapshot(`
Array [
  Array [
    "Explicit plugin paths [${TEST_EXTRA_PLUGIN_PATH}] are only supported in development. Relative imports will not work in production.",
  ],
]
`);
  expect(searchPaths).toEqual(Object.values(TEST_PLUGIN_SEARCH_PATHS));
  expect(devPluginPaths).toEqual([TEST_EXTRA_PLUGIN_PATH]);
});
