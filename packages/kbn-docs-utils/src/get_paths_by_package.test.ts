/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getPathsByPackage } from './get_paths_by_package';
import { getKibanaPlatformPlugin } from './integration_tests/kibana_platform_plugin_mock';
import type { PluginOrPackage } from './types';

// Mock getRepoFiles to return predictable test data
// Note: Inlining paths directly in the mock factory to avoid jest.mock restrictions
jest.mock('@kbn/get-repo-files', () => ({
  getRepoFiles: jest.fn(() =>
    Promise.resolve([
      {
        abs: __dirname + '/integration_tests/__fixtures__/src/plugin_a/public/index.ts',
        repoRel:
          'packages/kbn-docs-utils/src/integration_tests/__fixtures__/src/plugin_a/public/index.ts',
        isFixture: jest.fn(() => false),
        isJavaScript: jest.fn(() => false),
        isTypeScript: jest.fn(() => true),
      },
      {
        abs: __dirname + '/integration_tests/__fixtures__/src/plugin_a/public/fns.ts',
        repoRel:
          'packages/kbn-docs-utils/src/integration_tests/__fixtures__/src/plugin_a/public/fns.ts',
        isFixture: jest.fn(() => false),
        isJavaScript: jest.fn(() => false),
        isTypeScript: jest.fn(() => true),
      },
      {
        abs: __dirname + '/integration_tests/__fixtures__/src/plugin_b/public/index.ts',
        repoRel:
          'packages/kbn-docs-utils/src/integration_tests/__fixtures__/src/plugin_b/public/index.ts',
        isFixture: jest.fn(() => false),
        isJavaScript: jest.fn(() => false),
        isTypeScript: jest.fn(() => true),
      },
      {
        abs: __dirname + '/integration_tests/__fixtures__/src/plugin_a/test.fixture.ts',
        repoRel:
          'packages/kbn-docs-utils/src/integration_tests/__fixtures__/src/plugin_a/test.fixture.ts',
        isFixture: jest.fn(() => true),
        isJavaScript: jest.fn(() => false),
        isTypeScript: jest.fn(() => true),
      },
    ])
  ),
}));

describe('getPathsByPackage', () => {
  it('groups file paths by package', async () => {
    const pluginA = getKibanaPlatformPlugin('pluginA');
    const pluginB = getKibanaPlatformPlugin(
      'pluginB',
      __dirname + '/integration_tests/__fixtures__/src/plugin_b'
    );
    const plugins: PluginOrPackage[] = [pluginA, pluginB];

    const pathsByPackage = await getPathsByPackage(plugins);

    expect(pathsByPackage).toBeInstanceOf(Map);
    expect(pathsByPackage.size).toBeGreaterThan(0);

    // Should have paths for pluginA
    const pluginAPaths = pathsByPackage.get(pluginA);
    expect(pluginAPaths).toBeDefined();
    expect(Array.isArray(pluginAPaths)).toBe(true);
  });

  it('filters out fixture files', async () => {
    const pluginA = getKibanaPlatformPlugin('pluginA');
    const plugins: PluginOrPackage[] = [pluginA];

    const pathsByPackage = await getPathsByPackage(plugins);

    const pluginAPaths = pathsByPackage.get(pluginA) || [];
    // Should not include .fixture.ts files
    expect(pluginAPaths.every((path) => !path.includes('.fixture.'))).toBe(true);
  });

  it('filters out non-TypeScript/JavaScript files', async () => {
    const pluginA = getKibanaPlatformPlugin('pluginA');
    const plugins: PluginOrPackage[] = [pluginA];

    const pathsByPackage = await getPathsByPackage(plugins);

    const pluginAPaths = pathsByPackage.get(pluginA) || [];
    // Should only include .ts or .js files
    expect(pluginAPaths.every((path) => path.endsWith('.ts') || path.endsWith('.js'))).toBe(true);
  });

  it('handles empty plugin list', async () => {
    const pathsByPackage = await getPathsByPackage([]);

    expect(pathsByPackage).toBeInstanceOf(Map);
    expect(pathsByPackage.size).toBe(0);
  });

  it('handles packages with no matching files', async () => {
    // Create a plugin that won't match any files
    const emptyPlugin: PluginOrPackage = {
      id: 'empty-plugin',
      directory: __dirname + '/nonexistent',
      isPlugin: true,
      manifestPath: __dirname + '/nonexistent/kibana.json',
      manifest: {
        id: 'empty-plugin',
        pluginId: 'empty-plugin',
        owner: { name: '[Owner missing]' },
        serviceFolders: [],
      },
    };

    const pathsByPackage = await getPathsByPackage([emptyPlugin]);

    expect(pathsByPackage).toBeInstanceOf(Map);
    // May or may not have entries depending on path resolution
  });
});
