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

it('keeps the resolver test plugin out of default discovery', () => {
  expect(resolverTestPlugin.getPluginCategories().testPlugin).toBe(true);
  expect(getPluginPackagesFilter()(resolverTestPlugin)).toBe(false);
  expect(getPluginPackagesFilter({ testPlugins: true })(resolverTestPlugin)).toBe(true);
});
