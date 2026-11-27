/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import { Package, getPackages, getPluginPackagesFilter } from '..';

const repoRoot = Path.resolve(__dirname, '../../../../../..');

it('loads a relocated test plugin only when its path is explicitly requested', () => {
  const plugin = getPackages(repoRoot).find(
    ({ id }) => id === '@kbn/kbn-tp-custom-visualizations-plugin'
  );
  if (!plugin) {
    throw new Error('Custom visualizations test plugin was not discovered');
  }

  expect(plugin.getPluginCategories().testPlugin).toBe(true);
  expect(getPluginPackagesFilter()(plugin)).toBe(false);
  expect(getPluginPackagesFilter({ paths: [plugin.directory] })(plugin)).toBe(true);
});

const resolverTestPlugin = Package.fromManifest(
  repoRoot,
  Path.resolve(repoRoot, 'x-pack/solutions/security/test_plugins/resolver_test/kibana.jsonc')
);
const browserPlugin = Package.fromManifest(
  repoRoot,
  Path.resolve(repoRoot, 'src/platform/test_plugins/user_storage/kibana.jsonc')
);
const serverPlugin = Package.fromManifest(
  repoRoot,
  Path.resolve(
    repoRoot,
    'x-pack/platform/test_plugins/plugin_api_integration/elasticsearch_client/kibana.jsonc'
  )
);

it('keeps the resolver test plugin out of default discovery', () => {
  expect(resolverTestPlugin.getPluginCategories().testPlugin).toBe(true);
  expect(getPluginPackagesFilter()(resolverTestPlugin)).toBe(false);
  expect(getPluginPackagesFilter({ testPlugins: true })(resolverTestPlugin)).toBe(true);
});

describe.each(['src/platform/test_plugins/', 'x-pack/platform/test_plugins/'])(
  'plugins under %s',
  (testDir) => {
    it.each([
      ['browser', browserPlugin],
      ['server-only', serverPlugin],
    ])('keeps %s plugins opt-in', (_kind, sourcePlugin) => {
      const plugin = new Package(
        repoRoot,
        Path.resolve(repoRoot, testDir, 'sample_plugin'),
        sourcePlugin.manifest,
        sourcePlugin.pkg
      );

      expect(plugin.getPluginCategories().testPlugin).toBe(true);
      expect(getPluginPackagesFilter()(plugin)).toBe(false);
      expect(getPluginPackagesFilter({ testPlugins: true })(plugin)).toBe(true);
      expect(getPluginPackagesFilter({ paths: [plugin.directory] })(plugin)).toBe(true);
    });
  }
);

describe('test plugin discovery', () => {
  it('keeps plugins in the sibling test fixture trees out of production bundles', () => {
    const fixtures = getPackages(repoRoot).filter(
      ({ normalizedRepoRelativeDir }) =>
        normalizedRepoRelativeDir.startsWith('src/platform/test_plugins/') ||
        normalizedRepoRelativeDir.startsWith('x-pack/platform/test_plugins/')
    );
    const productionPlugins = getPluginPackagesFilter({ browser: true });
    const testPlugins = getPluginPackagesFilter({ browser: true, testPlugins: true });

    expect(fixtures.map(({ name }) => name)).toEqual(
      expect.arrayContaining([
        '@kbn/foo-plugin',
        '@kbn/hardening-plugin',
        '@kbn/interactive-setup-test-endpoints-plugin',
        '@kbn/security-test-endpoints-plugin',
        '@kbn/test-feature-usage-plugin',
      ])
    );

    for (const fixture of fixtures) {
      expect(productionPlugins(fixture)).toBe(false);
      if (fixture.isPlugin() && fixture.manifest.plugin.browser) {
        expect(testPlugins(fixture)).toBe(true);
      }
    }
  });

  it('loads interactive setup verification endpoints only when explicitly requested', () => {
    const plugin = getPackages(repoRoot).find(
      ({ id }) => id === '@kbn/interactive-setup-test-endpoints-plugin'
    );
    if (!plugin) {
      throw new Error('Interactive setup test endpoints plugin was not discovered');
    }

    expect(plugin.getPluginCategories().testPlugin).toBe(true);
    expect(getPluginPackagesFilter()(plugin)).toBe(false);
    expect(getPluginPackagesFilter({ paths: [plugin.directory] })(plugin)).toBe(true);
  });
});
