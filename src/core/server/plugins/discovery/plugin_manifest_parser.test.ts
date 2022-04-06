/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { mockReadFile } from './plugin_manifest_parser.test.mocks';

import { PluginDiscoveryErrorType } from './plugin_discovery_error';

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
    cb(null, Buffer.from(JSON.stringify({ version: 'some-version', owner: { name: 'foo' } })));
  });

  await expect(parseManifest(pluginPath, packageInfo)).rejects.toMatchObject({
    message: `Plugin manifest must contain an "id" property. (invalid-manifest, ${pluginManifestPath})`,
    type: PluginDiscoveryErrorType.InvalidManifest,
    path: pluginManifestPath,
  });
});

test('return error when plugin id includes `.` characters', async () => {
  mockReadFile.mockImplementation((path, cb) => {
    cb(
      null,
      Buffer.from(
        JSON.stringify({ id: 'some.name', version: 'some-version', owner: { name: 'foo' } })
      )
    );
  });

  await expect(parseManifest(pluginPath, packageInfo)).rejects.toMatchObject({
    message: `Plugin "id" must not include \`.\` characters. (invalid-manifest, ${pluginManifestPath})`,
    type: PluginDiscoveryErrorType.InvalidManifest,
    path: pluginManifestPath,
  });
});

test('return error when pluginId is not in camelCase format', async () => {
  expect.assertions(1);
  mockReadFile.mockImplementation((path, cb) => {
    cb(
      null,
      Buffer.from(
        JSON.stringify({ id: 'some_name', version: 'kibana', server: true, owner: { name: 'foo' } })
      )
    );
  });

  await expect(parseManifest(pluginPath, packageInfo)).rejects.toMatchObject({
    message: `Plugin "id" must be camelCase, but found: some_name. (invalid-manifest, ${pluginManifestPath})`,
    type: PluginDiscoveryErrorType.InvalidManifest,
    path: pluginManifestPath,
  });
});

test('return error when plugin version is missing', async () => {
  mockReadFile.mockImplementation((path, cb) => {
    cb(null, Buffer.from(JSON.stringify({ id: 'someId', owner: { name: 'foo' } })));
  });

  await expect(parseManifest(pluginPath, packageInfo)).rejects.toMatchObject({
    message: `Plugin manifest for "someId" must contain a "version" property. (invalid-manifest, ${pluginManifestPath})`,
    type: PluginDiscoveryErrorType.InvalidManifest,
    path: pluginManifestPath,
  });
});

test('return error when plugin expected Kibana version is lower than actual version', async () => {
  mockReadFile.mockImplementation((path, cb) => {
    cb(
      null,
      Buffer.from(JSON.stringify({ id: 'someId', version: '6.4.2', owner: { name: 'foo' } }))
    );
  });

  await expect(parseManifest(pluginPath, packageInfo)).rejects.toMatchObject({
    message: `Plugin "someId" is only compatible with Kibana version "6.4.2", but used Kibana version is "7.0.0-alpha1". (incompatible-version, ${pluginManifestPath})`,
    type: PluginDiscoveryErrorType.IncompatibleVersion,
    path: pluginManifestPath,
  });
});

test('return error when plugin expected Kibana version cannot be interpreted as semver', async () => {
  mockReadFile.mockImplementation((path, cb) => {
    cb(
      null,
      Buffer.from(
        JSON.stringify({
          id: 'someId',
          version: '1.0.0',
          kibanaVersion: 'non-sem-ver',
          owner: { name: 'foo' },
        })
      )
    );
  });

  await expect(parseManifest(pluginPath, packageInfo)).rejects.toMatchObject({
    message: `Plugin "someId" is only compatible with Kibana version "non-sem-ver", but used Kibana version is "7.0.0-alpha1". (incompatible-version, ${pluginManifestPath})`,
    type: PluginDiscoveryErrorType.IncompatibleVersion,
    path: pluginManifestPath,
  });
});

test('return error when plugin config path is not a string', async () => {
  mockReadFile.mockImplementation((path, cb) => {
    cb(
      null,
      Buffer.from(
        JSON.stringify({ id: 'someId', version: '7.0.0', configPath: 2, owner: { name: 'foo' } })
      )
    );
  });

  await expect(parseManifest(pluginPath, packageInfo)).rejects.toMatchObject({
    message: `The "configPath" in plugin manifest for "someId" should either be a string or an array of strings. (invalid-manifest, ${pluginManifestPath})`,
    type: PluginDiscoveryErrorType.InvalidManifest,
    path: pluginManifestPath,
  });
});

test('return error when plugin config path is an array that contains non-string values', async () => {
  mockReadFile.mockImplementation((path, cb) => {
    cb(
      null,
      Buffer.from(
        JSON.stringify({
          id: 'someId',
          version: '7.0.0',
          configPath: ['config', 2],
          owner: { name: 'foo' },
        })
      )
    );
  });

  await expect(parseManifest(pluginPath, packageInfo)).rejects.toMatchObject({
    message: `The "configPath" in plugin manifest for "someId" should either be a string or an array of strings. (invalid-manifest, ${pluginManifestPath})`,
    type: PluginDiscoveryErrorType.InvalidManifest,
    path: pluginManifestPath,
  });
});

test('return error when plugin expected Kibana version is higher than actual version', async () => {
  mockReadFile.mockImplementation((path, cb) => {
    cb(
      null,
      Buffer.from(JSON.stringify({ id: 'someId', version: '7.0.1', owner: { name: 'foo' } }))
    );
  });

  await expect(parseManifest(pluginPath, packageInfo)).rejects.toMatchObject({
    message: `Plugin "someId" is only compatible with Kibana version "7.0.1", but used Kibana version is "7.0.0-alpha1". (incompatible-version, ${pluginManifestPath})`,
    type: PluginDiscoveryErrorType.IncompatibleVersion,
    path: pluginManifestPath,
  });
});

test('return error when both `server` and `ui` are set to `false` or missing', async () => {
  mockReadFile.mockImplementation((path, cb) => {
    cb(
      null,
      Buffer.from(JSON.stringify({ id: 'someId', version: '7.0.0', owner: { name: 'foo' } }))
    );
  });

  await expect(parseManifest(pluginPath, packageInfo)).rejects.toMatchObject({
    message: `Both "server" and "ui" are missing or set to "false" in plugin manifest for "someId", but at least one of these must be set to "true". (invalid-manifest, ${pluginManifestPath})`,
    type: PluginDiscoveryErrorType.InvalidManifest,
    path: pluginManifestPath,
  });

  mockReadFile.mockImplementation((path, cb) => {
    cb(
      null,
      Buffer.from(
        JSON.stringify({
          id: 'someId',
          version: '7.0.0',
          server: false,
          ui: false,
          owner: { name: 'foo' },
        })
      )
    );
  });

  await expect(parseManifest(pluginPath, packageInfo)).rejects.toMatchObject({
    message: `Both "server" and "ui" are missing or set to "false" in plugin manifest for "someId", but at least one of these must be set to "true". (invalid-manifest, ${pluginManifestPath})`,
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
          id: 'someId',
          version: '7.0.0',
          server: true,
          unknownOne: 'one',
          unknownTwo: true,
          owner: { name: 'foo' },
        })
      )
    );
  });

  await expect(parseManifest(pluginPath, packageInfo)).rejects.toMatchObject({
    message: `Manifest for plugin "someId" contains the following unrecognized properties: unknownOne,unknownTwo. (invalid-manifest, ${pluginManifestPath})`,
    type: PluginDiscoveryErrorType.InvalidManifest,
    path: pluginManifestPath,
  });
});

test('returns error when manifest contains unrecognized `type`', async () => {
  mockReadFile.mockImplementation((path, cb) => {
    cb(
      null,
      Buffer.from(
        JSON.stringify({
          id: 'someId',
          version: '7.0.0',
          kibanaVersion: '7.0.0',
          type: 'unknown',
          server: true,
          owner: { name: 'foo' },
        })
      )
    );
  });

  await expect(parseManifest(pluginPath, packageInfo)).rejects.toMatchObject({
    message: `The "type" in manifest for plugin "someId" is set to "unknown", but it should either be "standard" or "preboot". (invalid-manifest, ${pluginManifestPath})`,
    type: PluginDiscoveryErrorType.InvalidManifest,
    path: pluginManifestPath,
  });
});

describe('configPath', () => {
  test('falls back to plugin id if not specified', async () => {
    mockReadFile.mockImplementation((path, cb) => {
      cb(
        null,
        Buffer.from(
          JSON.stringify({ id: 'plugin', version: '7.0.0', server: true, owner: { name: 'foo' } })
        )
      );
    });

    const manifest = await parseManifest(pluginPath, packageInfo);
    expect(manifest.configPath).toBe(manifest.id);
  });

  test('falls back to plugin id in snakeCase format', async () => {
    mockReadFile.mockImplementation((path, cb) => {
      cb(
        null,
        Buffer.from(
          JSON.stringify({ id: 'someId', version: '7.0.0', server: true, owner: { name: 'foo' } })
        )
      );
    });

    const manifest = await parseManifest(pluginPath, packageInfo);
    expect(manifest.configPath).toBe('some_id');
  });

  test('not formatted to snakeCase if defined explicitly as string', async () => {
    mockReadFile.mockImplementation((path, cb) => {
      cb(
        null,
        Buffer.from(
          JSON.stringify({
            id: 'someId',
            configPath: 'somePath',
            version: '7.0.0',
            server: true,
            owner: { name: 'foo' },
          })
        )
      );
    });

    const manifest = await parseManifest(pluginPath, packageInfo);
    expect(manifest.configPath).toBe('somePath');
  });

  test('not formatted to snakeCase if defined explicitly as an array of strings', async () => {
    mockReadFile.mockImplementation((path, cb) => {
      cb(
        null,
        Buffer.from(
          JSON.stringify({
            id: 'someId',
            configPath: ['somePath'],
            version: '7.0.0',
            server: true,
            owner: { name: 'foo' },
          })
        )
      );
    });

    const manifest = await parseManifest(pluginPath, packageInfo);
    expect(manifest.configPath).toEqual(['somePath']);
  });
});

test('set defaults for all missing optional fields', async () => {
  mockReadFile.mockImplementation((path, cb) => {
    cb(
      null,
      Buffer.from(
        JSON.stringify({ id: 'someId', version: '7.0.0', server: true, owner: { name: 'foo' } })
      )
    );
  });

  await expect(parseManifest(pluginPath, packageInfo)).resolves.toEqual({
    id: 'someId',
    configPath: 'some_id',
    version: '7.0.0',
    kibanaVersion: '7.0.0',
    type: 'standard',
    optionalPlugins: [],
    requiredPlugins: [],
    requiredBundles: [],
    server: true,
    ui: false,
    owner: { name: 'foo' },
  });
});

test('return all set optional fields as they are in manifest', async () => {
  mockReadFile.mockImplementation((path, cb) => {
    cb(
      null,
      Buffer.from(
        JSON.stringify({
          id: 'someId',
          configPath: ['some', 'path'],
          version: 'some-version',
          kibanaVersion: '7.0.0',
          type: 'preboot',
          requiredPlugins: ['some-required-plugin', 'some-required-plugin-2'],
          optionalPlugins: ['some-optional-plugin'],
          ui: true,
          owner: { name: 'foo' },
          enableForAnonymousPages: true,
        })
      )
    );
  });

  await expect(parseManifest(pluginPath, packageInfo)).resolves.toEqual({
    id: 'someId',
    configPath: ['some', 'path'],
    version: 'some-version',
    kibanaVersion: '7.0.0',
    type: 'preboot',
    optionalPlugins: ['some-optional-plugin'],
    requiredBundles: [],
    requiredPlugins: ['some-required-plugin', 'some-required-plugin-2'],
    server: false,
    ui: true,
    owner: { name: 'foo' },
    enableForAnonymousPages: true,
  });
});

test('return manifest when plugin expected Kibana version matches actual version', async () => {
  mockReadFile.mockImplementation((path, cb) => {
    cb(
      null,
      Buffer.from(
        JSON.stringify({
          id: 'someId',
          configPath: 'some-path',
          version: 'some-version',
          kibanaVersion: '7.0.0-alpha2',
          requiredPlugins: ['some-required-plugin'],
          server: true,
          owner: { name: 'foo' },
        })
      )
    );
  });

  await expect(parseManifest(pluginPath, packageInfo)).resolves.toEqual({
    id: 'someId',
    configPath: 'some-path',
    version: 'some-version',
    kibanaVersion: '7.0.0-alpha2',
    type: 'standard',
    optionalPlugins: [],
    requiredPlugins: ['some-required-plugin'],
    requiredBundles: [],
    server: true,
    ui: false,
    owner: { name: 'foo' },
  });
});

test('return manifest when plugin expected Kibana version is `kibana`', async () => {
  mockReadFile.mockImplementation((path, cb) => {
    cb(
      null,
      Buffer.from(
        JSON.stringify({
          id: 'someId',
          version: 'some-version',
          kibanaVersion: 'kibana',
          requiredPlugins: ['some-required-plugin'],
          server: true,
          ui: true,
          owner: { name: 'foo' },
        })
      )
    );
  });

  await expect(parseManifest(pluginPath, packageInfo)).resolves.toEqual({
    id: 'someId',
    configPath: 'some_id',
    version: 'some-version',
    kibanaVersion: 'kibana',
    type: 'standard',
    optionalPlugins: [],
    requiredPlugins: ['some-required-plugin'],
    requiredBundles: [],
    server: true,
    ui: true,
    owner: { name: 'foo' },
  });
});
