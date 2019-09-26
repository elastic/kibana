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

import { PluginDiscoveryErrorType } from './plugin_discovery_error';

import { mockReadFile } from './plugin_manifest_parser.test.mocks';

import { resolve } from 'path';
import { parseManifest } from './plugin_manifest_parser';

const pluginPath = resolve('path', 'existent-dir');
const pluginManifestPath = resolve(pluginPath, 'kibana.json');
const packageInfo = {
  branch: 'master',
  buildNum: 1,
  buildSha: '',
  version: '7.0.0-alpha1',
  dist: false,
};

afterEach(() => {
  jest.clearAllMocks();
});

test('return error when manifest is empty', async () => {
  mockReadFile.mockImplementation((path, cb) => {
    cb(null, Buffer.from(''));
  });

  await expect(parseManifest(pluginPath, packageInfo)).rejects.toMatchObject({
    message: `Unexpected end of JSON input (invalid-manifest, ${pluginManifestPath})`,
    type: PluginDiscoveryErrorType.InvalidManifest,
    path: pluginManifestPath,
  });
});

test('return error when manifest content is null', async () => {
  mockReadFile.mockImplementation((path, cb) => {
    cb(null, Buffer.from('null'));
  });

  await expect(parseManifest(pluginPath, packageInfo)).rejects.toMatchObject({
    message: `Plugin manifest must contain a JSON encoded object. (invalid-manifest, ${pluginManifestPath})`,
    type: PluginDiscoveryErrorType.InvalidManifest,
    path: pluginManifestPath,
  });
});

test('return error when manifest content is not a valid JSON', async () => {
  mockReadFile.mockImplementation((path, cb) => {
    cb(null, Buffer.from('not-json'));
  });

  await expect(parseManifest(pluginPath, packageInfo)).rejects.toMatchObject({
    message: `Unexpected token o in JSON at position 1 (invalid-manifest, ${pluginManifestPath})`,
    type: PluginDiscoveryErrorType.InvalidManifest,
    path: pluginManifestPath,
  });
});

test('return error when plugin id is missing', async () => {
  mockReadFile.mockImplementation((path, cb) => {
    cb(null, Buffer.from(JSON.stringify({ version: 'some-version' })));
  });

  await expect(parseManifest(pluginPath, packageInfo)).rejects.toMatchObject({
    message: `Plugin manifest must contain an "id" property. (invalid-manifest, ${pluginManifestPath})`,
    type: PluginDiscoveryErrorType.InvalidManifest,
    path: pluginManifestPath,
  });
});

test('return error when plugin id includes `.` characters', async () => {
  mockReadFile.mockImplementation((path, cb) => {
    cb(null, Buffer.from(JSON.stringify({ id: 'some.name', version: 'some-version' })));
  });

  await expect(parseManifest(pluginPath, packageInfo)).rejects.toMatchObject({
    message: `Plugin "id" must not include \`.\` characters. (invalid-manifest, ${pluginManifestPath})`,
    type: PluginDiscoveryErrorType.InvalidManifest,
    path: pluginManifestPath,
  });
});

test('return error when plugin version is missing', async () => {
  mockReadFile.mockImplementation((path, cb) => {
    cb(null, Buffer.from(JSON.stringify({ id: 'some-id' })));
  });

  await expect(parseManifest(pluginPath, packageInfo)).rejects.toMatchObject({
    message: `Plugin manifest for "some-id" must contain a "version" property. (invalid-manifest, ${pluginManifestPath})`,
    type: PluginDiscoveryErrorType.InvalidManifest,
    path: pluginManifestPath,
  });
});

test('return error when plugin expected Kibana version is lower than actual version', async () => {
  mockReadFile.mockImplementation((path, cb) => {
    cb(null, Buffer.from(JSON.stringify({ id: 'some-id', version: '6.4.2' })));
  });

  await expect(parseManifest(pluginPath, packageInfo)).rejects.toMatchObject({
    message: `Plugin "some-id" is only compatible with Kibana version "6.4.2", but used Kibana version is "7.0.0-alpha1". (incompatible-version, ${pluginManifestPath})`,
    type: PluginDiscoveryErrorType.IncompatibleVersion,
    path: pluginManifestPath,
  });
});

test('return error when plugin expected Kibana version cannot be interpreted as semver', async () => {
  mockReadFile.mockImplementation((path, cb) => {
    cb(
      null,
      Buffer.from(JSON.stringify({ id: 'some-id', version: '1.0.0', kibanaVersion: 'non-sem-ver' }))
    );
  });

  await expect(parseManifest(pluginPath, packageInfo)).rejects.toMatchObject({
    message: `Plugin "some-id" is only compatible with Kibana version "non-sem-ver", but used Kibana version is "7.0.0-alpha1". (incompatible-version, ${pluginManifestPath})`,
    type: PluginDiscoveryErrorType.IncompatibleVersion,
    path: pluginManifestPath,
  });
});

test('return error when plugin config path is not a string', async () => {
  mockReadFile.mockImplementation((path, cb) => {
    cb(null, Buffer.from(JSON.stringify({ id: 'some-id', version: '7.0.0', configPath: 2 })));
  });

  await expect(parseManifest(pluginPath, packageInfo)).rejects.toMatchObject({
    message: `The "configPath" in plugin manifest for "some-id" should either be a string or an array of strings. (invalid-manifest, ${pluginManifestPath})`,
    type: PluginDiscoveryErrorType.InvalidManifest,
    path: pluginManifestPath,
  });
});

test('return error when plugin config path is an array that contains non-string values', async () => {
  mockReadFile.mockImplementation((path, cb) => {
    cb(
      null,
      Buffer.from(JSON.stringify({ id: 'some-id', version: '7.0.0', configPath: ['config', 2] }))
    );
  });

  await expect(parseManifest(pluginPath, packageInfo)).rejects.toMatchObject({
    message: `The "configPath" in plugin manifest for "some-id" should either be a string or an array of strings. (invalid-manifest, ${pluginManifestPath})`,
    type: PluginDiscoveryErrorType.InvalidManifest,
    path: pluginManifestPath,
  });
});

test('return error when plugin expected Kibana version is higher than actual version', async () => {
  mockReadFile.mockImplementation((path, cb) => {
    cb(null, Buffer.from(JSON.stringify({ id: 'some-id', version: '7.0.1' })));
  });

  await expect(parseManifest(pluginPath, packageInfo)).rejects.toMatchObject({
    message: `Plugin "some-id" is only compatible with Kibana version "7.0.1", but used Kibana version is "7.0.0-alpha1". (incompatible-version, ${pluginManifestPath})`,
    type: PluginDiscoveryErrorType.IncompatibleVersion,
    path: pluginManifestPath,
  });
});

test('return error when both `server` and `ui` are set to `false` or missing', async () => {
  mockReadFile.mockImplementation((path, cb) => {
    cb(null, Buffer.from(JSON.stringify({ id: 'some-id', version: '7.0.0' })));
  });

  await expect(parseManifest(pluginPath, packageInfo)).rejects.toMatchObject({
    message: `Both "server" and "ui" are missing or set to "false" in plugin manifest for "some-id", but at least one of these must be set to "true". (invalid-manifest, ${pluginManifestPath})`,
    type: PluginDiscoveryErrorType.InvalidManifest,
    path: pluginManifestPath,
  });

  mockReadFile.mockImplementation((path, cb) => {
    cb(
      null,
      Buffer.from(JSON.stringify({ id: 'some-id', version: '7.0.0', server: false, ui: false }))
    );
  });

  await expect(parseManifest(pluginPath, packageInfo)).rejects.toMatchObject({
    message: `Both "server" and "ui" are missing or set to "false" in plugin manifest for "some-id", but at least one of these must be set to "true". (invalid-manifest, ${pluginManifestPath})`,
    type: PluginDiscoveryErrorType.InvalidManifest,
    path: pluginManifestPath,
  });
});

test('return error when manifest contains unrecognized properties', async () => {
  mockReadFile.mockImplementation((path, cb) => {
    cb(
      null,
      Buffer.from(
        JSON.stringify({
          id: 'some-id',
          version: '7.0.0',
          server: true,
          unknownOne: 'one',
          unknownTwo: true,
        })
      )
    );
  });

  await expect(parseManifest(pluginPath, packageInfo)).rejects.toMatchObject({
    message: `Manifest for plugin "some-id" contains the following unrecognized properties: unknownOne,unknownTwo. (invalid-manifest, ${pluginManifestPath})`,
    type: PluginDiscoveryErrorType.InvalidManifest,
    path: pluginManifestPath,
  });
});

test('set defaults for all missing optional fields', async () => {
  mockReadFile.mockImplementation((path, cb) => {
    cb(null, Buffer.from(JSON.stringify({ id: 'some-id', version: '7.0.0', server: true })));
  });

  await expect(parseManifest(pluginPath, packageInfo)).resolves.toEqual({
    id: 'some-id',
    configPath: 'some-id',
    version: '7.0.0',
    kibanaVersion: '7.0.0',
    optionalPlugins: [],
    requiredPlugins: [],
    server: true,
    ui: false,
  });
});

test('return all set optional fields as they are in manifest', async () => {
  mockReadFile.mockImplementation((path, cb) => {
    cb(
      null,
      Buffer.from(
        JSON.stringify({
          id: 'some-id',
          configPath: ['some', 'path'],
          version: 'some-version',
          kibanaVersion: '7.0.0',
          requiredPlugins: ['some-required-plugin', 'some-required-plugin-2'],
          optionalPlugins: ['some-optional-plugin'],
          ui: true,
        })
      )
    );
  });

  await expect(parseManifest(pluginPath, packageInfo)).resolves.toEqual({
    id: 'some-id',
    configPath: ['some', 'path'],
    version: 'some-version',
    kibanaVersion: '7.0.0',
    optionalPlugins: ['some-optional-plugin'],
    requiredPlugins: ['some-required-plugin', 'some-required-plugin-2'],
    server: false,
    ui: true,
  });
});

test('return manifest when plugin expected Kibana version matches actual version', async () => {
  mockReadFile.mockImplementation((path, cb) => {
    cb(
      null,
      Buffer.from(
        JSON.stringify({
          id: 'some-id',
          configPath: 'some-path',
          version: 'some-version',
          kibanaVersion: '7.0.0-alpha2',
          requiredPlugins: ['some-required-plugin'],
          server: true,
        })
      )
    );
  });

  await expect(parseManifest(pluginPath, packageInfo)).resolves.toEqual({
    id: 'some-id',
    configPath: 'some-path',
    version: 'some-version',
    kibanaVersion: '7.0.0-alpha2',
    optionalPlugins: [],
    requiredPlugins: ['some-required-plugin'],
    server: true,
    ui: false,
  });
});

test('return manifest when plugin expected Kibana version is `kibana`', async () => {
  mockReadFile.mockImplementation((path, cb) => {
    cb(
      null,
      Buffer.from(
        JSON.stringify({
          id: 'some-id',
          version: 'some-version',
          kibanaVersion: 'kibana',
          requiredPlugins: ['some-required-plugin'],
          server: true,
          ui: true,
        })
      )
    );
  });

  await expect(parseManifest(pluginPath, packageInfo)).resolves.toEqual({
    id: 'some-id',
    configPath: 'some-id',
    version: 'some-version',
    kibanaVersion: 'kibana',
    optionalPlugins: [],
    requiredPlugins: ['some-required-plugin'],
    server: true,
    ui: true,
  });
});
