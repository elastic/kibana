/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginPackageManifest } from '@kbn/repo-packages';
import { PluginType } from '@kbn/core-base-common';
import { pluginManifestFromPluginPackage } from './plugin_manifest_from_plugin_package';

const kibanaVersion = `1.${Math.round(10 * Math.random())}.1`;
const minimal: PluginPackageManifest = {
  type: 'plugin',
  id: '@kbn/some-legacy-plugin',
  owner: ['@elastic/team-a', '@elastic/team-b'],
  plugin: {
    id: 'someLegacyPluginId',
    browser: true,
    server: true,
  },
};
const basic: PluginPackageManifest = {
  ...minimal,
  plugin: {
    ...minimal.plugin,
    type: 'preboot',
    configPath: ['some', 'legacy'],
    enabledOnAnonymousPages: false,
    extraPublicDirs: ['foo', 'bar'],
    optionalPlugins: ['someOtherPlugin'],
    requiredBundles: ['someRequiresBundlePlugin'],
    requiredPlugins: ['someRequiredPlugin'],
  },
  serviceFolders: ['foo', 'bar'],
};

describe('pluginManifestFromPluginPackage()', () => {
  it('consumes correct values from plugin package manifest', () => {
    expect(pluginManifestFromPluginPackage('static', basic)).toMatchInlineSnapshot(`
      Object {
        "configPath": Array [
          "some",
          "legacy",
        ],
        "enabledOnAnonymousPages": false,
        "id": "someLegacyPluginId",
        "kibanaVersion": "static",
        "optionalPlugins": Array [
          "someOtherPlugin",
        ],
        "owner": Object {
          "name": "@elastic/team-a & @elastic/team-b",
        },
        "requiredBundles": Array [
          "someRequiresBundlePlugin",
        ],
        "requiredPlugins": Array [
          "someRequiredPlugin",
        ],
        "server": true,
        "serviceFolders": Array [
          "foo",
          "bar",
        ],
        "type": "preboot",
        "ui": true,
        "version": "1.0.0",
      }
    `);
  });

  it('applies correct defaults', () => {
    const pm = pluginManifestFromPluginPackage(kibanaVersion, minimal);
    expect(pm).toHaveProperty('type', PluginType.standard);
    expect(pm.enabledOnAnonymousPages).toBeUndefined();
    expect(pm.serviceFolders).toBeUndefined();
    expect(pm).toHaveProperty('kibanaVersion', kibanaVersion);
    expect(pm).toHaveProperty('optionalPlugins', []);
    expect(pm).toHaveProperty('requiredBundles', []);
    expect(pm).toHaveProperty('requiredPlugins', []);
    expect(pm).toHaveProperty('owner', {
      name: '@elastic/team-a & @elastic/team-b',
    });
    expect(pm).toHaveProperty('server', true);
    expect(pm).toHaveProperty('ui', true);
    expect(pm).toHaveProperty('configPath', 'some_legacy_plugin_id');
  });

  it('reflects plugin.server', () => {
    expect(
      pluginManifestFromPluginPackage(kibanaVersion, {
        ...minimal,
        plugin: { ...minimal.plugin, server: false },
      })
    ).toHaveProperty('server', false);
    expect(
      pluginManifestFromPluginPackage(kibanaVersion, {
        ...minimal,
        plugin: { ...minimal.plugin, server: true },
      })
    ).toHaveProperty('server', true);
  });

  it('reflects plugin.browser', () => {
    expect(
      pluginManifestFromPluginPackage(kibanaVersion, {
        ...minimal,
        plugin: { ...minimal.plugin, browser: false },
      })
    ).toHaveProperty('ui', false);
    expect(
      pluginManifestFromPluginPackage(kibanaVersion, {
        ...minimal,
        plugin: { ...minimal.plugin, browser: true },
      })
    ).toHaveProperty('ui', true);
  });
});
