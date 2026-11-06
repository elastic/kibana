/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import { getPackages, getPluginPackagesFilter } from '..';

describe('test plugin discovery', () => {
  it('keeps plugins in the sibling test fixture trees out of production bundles', () => {
    const repoRoot = Path.resolve(__dirname, '../../../../../..');
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
});
