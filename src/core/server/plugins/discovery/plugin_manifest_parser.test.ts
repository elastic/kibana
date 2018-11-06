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

const mockReadFile = jest.fn();
jest.mock('fs', () => ({ readFile: mockReadFile }));

import { resolve } from 'path';
import { parseManifest } from './plugin_manifest_parser';

const pluginPath = resolve('path', 'existent-dir');
const pluginManifestPath = resolve(pluginPath, 'kibana.json');
const packageInfo = {
  branch: 'master',
  buildNum: 1,
  buildSha: '',
  version: '7.0.0-alpha1',
};

afterEach(() => {
  jest.clearAllMocks();
});

test('return error when manifest is empty', async () => {
  mockReadFile.mockImplementation((path, cb) => {
    cb(null, Buffer.from(''));
  });

  await expect(parseManifest(pluginPath, packageInfo)).rejects.toMatchObject({
    message: 'Unexpected end of JSON input',
    type: PluginDiscoveryErrorType.InvalidManifest,
    path: pluginManifestPath,
  });
});

test('return error when manifest content is null', async () => {
  mockReadFile.mockImplementation((path, cb) => {
    cb(null, Buffer.from('null'));
  });

  await expect(parseManifest(pluginPath, packageInfo)).rejects.toMatchObject({
    message: 'Plugin manifest must contain a JSON encoded object.',
    type: PluginDiscoveryErrorType.InvalidManifest,
    path: pluginManifestPath,
  });
});

test('return error when manifest content is not a valid JSON', async () => {
  mockReadFile.mockImplementation((path, cb) => {
    cb(null, Buffer.from('not-json'));
  });

  await expect(parseManifest(pluginPath, packageInfo)).rejects.toMatchObject({
    message: 'Unexpected token o in JSON at position 1',
    type: PluginDiscoveryErrorType.InvalidManifest,
    path: pluginManifestPath,
  });
});

test('return error when plugin id is missing', async () => {
  mockReadFile.mockImplementation((path, cb) => {
    cb(null, Buffer.from(JSON.stringify({ version: 'some-version' })));
  });

  await expect(parseManifest(pluginPath, packageInfo)).rejects.toMatchObject({
    message: 'Plugin manifest must contain an "id" property.',
    type: PluginDiscoveryErrorType.InvalidManifest,
    path: pluginManifestPath,
  });
});

test('return error when plugin version is missing', async () => {
  mockReadFile.mockImplementation((path, cb) => {
    cb(null, Buffer.from(JSON.stringify({ id: 'some-id' })));
  });

  await expect(parseManifest(pluginPath, packageInfo)).rejects.toMatchObject({
    message: 'Plugin manifest for "some-id" must contain a "version" property.',
    type: PluginDiscoveryErrorType.InvalidManifest,
    path: pluginManifestPath,
  });
});

test('return error when plugin expected Kibana version is lower than actual version', async () => {
  mockReadFile.mockImplementation((path, cb) => {
    cb(null, Buffer.from(JSON.stringify({ id: 'some-id', version: '6.4.2' })));
  });

  await expect(parseManifest(pluginPath, packageInfo)).rejects.toMatchObject({
    message:
      'Plugin "some-id" is only compatible with Kibana version "6.4.2", but used Kibana version is "7.0.0-alpha1".',
    type: PluginDiscoveryErrorType.IncompatibleVersion,
    path: pluginManifestPath,
  });
});

test('return error when plugin expected Kibana version is higher than actual version', async () => {
  mockReadFile.mockImplementation((path, cb) => {
    cb(null, Buffer.from(JSON.stringify({ id: 'some-id', version: '7.0.1' })));
  });

  await expect(parseManifest(pluginPath, packageInfo)).rejects.toMatchObject({
    message:
      'Plugin "some-id" is only compatible with Kibana version "7.0.1", but used Kibana version is "7.0.0-alpha1".',
    type: PluginDiscoveryErrorType.IncompatibleVersion,
    path: pluginManifestPath,
  });
});

test('set defaults for all missing optional fields', async () => {
  mockReadFile.mockImplementation((path, cb) => {
    cb(null, Buffer.from(JSON.stringify({ id: 'some-id', version: '7.0.0' })));
  });

  await expect(parseManifest(pluginPath, packageInfo)).resolves.toEqual({
    id: 'some-id',
    version: '7.0.0',
    kibanaVersion: '7.0.0',
    optionalPlugins: [],
    requiredPlugins: [],
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
    version: 'some-version',
    kibanaVersion: '7.0.0',
    optionalPlugins: ['some-optional-plugin'],
    requiredPlugins: ['some-required-plugin', 'some-required-plugin-2'],
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
          version: 'some-version',
          kibanaVersion: '7.0.0-alpha2',
          requiredPlugins: ['some-required-plugin'],
        })
      )
    );
  });

  await expect(parseManifest(pluginPath, packageInfo)).resolves.toEqual({
    id: 'some-id',
    version: 'some-version',
    kibanaVersion: '7.0.0-alpha2',
    optionalPlugins: [],
    requiredPlugins: ['some-required-plugin'],
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
        })
      )
    );
  });

  await expect(parseManifest(pluginPath, packageInfo)).resolves.toEqual({
    id: 'some-id',
    version: 'some-version',
    kibanaVersion: 'kibana',
    optionalPlugins: [],
    requiredPlugins: ['some-required-plugin'],
    ui: false,
  });
});
