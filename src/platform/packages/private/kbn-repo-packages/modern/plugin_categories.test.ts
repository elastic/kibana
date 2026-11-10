/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import { Package, getPluginPackagesFilter } from '..';

const repoRoot = Path.resolve(__dirname, '../../../../../..');
const resolverTestPlugin = Package.fromManifest(
  repoRoot,
  Path.resolve(repoRoot, 'x-pack/solutions/security/test_plugins/resolver_test/kibana.jsonc')
);
const browserPlugin = Package.fromManifest(
  repoRoot,
  Path.resolve(repoRoot, 'src/platform/test/user_storage/plugins/user_storage_test/kibana.jsonc')
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
