/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PluginType } from '@kbn/core-base-common';
import type { InternalPluginInfo, UiPlugins } from '@kbn/core-plugins-base-server-internal';
import { getPluginsBundlePaths } from './get_plugin_bundle_paths';

const createUiPlugins = ({
  requiredBundles,
  requiredPlugins = {},
  anonymousPluginIds = [],
}: {
  requiredBundles: Record<string, string[]>;
  requiredPlugins?: Record<string, string[]>;
  anonymousPluginIds?: string[];
}) => {
  const uiPlugins: UiPlugins = {
    internal: new Map(),
    public: new Map(),
    browserConfigs: new Map(),
  };

  const addPlugin = (pluginId: string) => {
    uiPlugins.internal.set(pluginId, {
      requiredPlugins: requiredPlugins[pluginId] ?? [],
      requiredBundles: requiredBundles[pluginId] ?? [],
      version: '8.0.0',
      publicTargetDir: '',
      publicAssetsDir: '',
    } satisfies InternalPluginInfo);
    uiPlugins.public.set(pluginId, {
      id: pluginId,
      configPath: 'config-path',
      type: PluginType.standard,
      optionalPlugins: [],
      requiredPlugins: requiredPlugins[pluginId] ?? [],
      runtimePluginDependencies: [],
      requiredBundles: requiredBundles[pluginId] ?? [],
      enabledOnAnonymousPages: anonymousPluginIds.includes(pluginId),
    });
  };

  const pluginIds = new Set([
    ...Object.keys(requiredBundles),
    ...Object.values(requiredBundles).flat(),
    ...Object.keys(requiredPlugins),
    ...Object.values(requiredPlugins).flat(),
  ]);
  pluginIds.forEach(addPlugin);

  return uiPlugins;
};

describe('getPluginsBundlePaths', () => {
  it('returns an entry for each plugin and their bundle dependencies', () => {
    const pluginBundlePaths = getPluginsBundlePaths({
      bundlesHref: '/regular-bundle-path',
      uiPlugins: createUiPlugins({
        requiredBundles: {
          a: ['b', 'c'],
          b: ['d'],
        },
      }),
      isAnonymousPage: false, // This parameter is passed to filterUiPlugins, we have separate tests for that function
    });

    expect([...pluginBundlePaths.keys()].sort()).toEqual(['a', 'b', 'c', 'd']);
  });

  it('returns correct paths for each bundle', () => {
    const pluginBundlePaths = getPluginsBundlePaths({
      bundlesHref: '/regular-bundle-path',
      uiPlugins: createUiPlugins({
        requiredBundles: {
          a: ['b'],
        },
      }),
      isAnonymousPage: false,
    });

    expect(pluginBundlePaths.get('a')).toEqual({
      bundlePath: '/regular-bundle-path/plugin/a/8.0.0/a.plugin.js',
      publicPath: '/regular-bundle-path/plugin/a/8.0.0/',
    });

    expect(pluginBundlePaths.get('b')).toEqual({
      bundlePath: '/regular-bundle-path/plugin/b/8.0.0/b.plugin.js',
      publicPath: '/regular-bundle-path/plugin/b/8.0.0/',
    });
  });

  it('returns only anonymous plugins and their transitive required bundles', () => {
    const pluginBundlePaths = getPluginsBundlePaths({
      bundlesHref: '/regular-bundle-path',
      uiPlugins: createUiPlugins({
        requiredBundles: {
          anonymous: ['bundleDependency'],
          bundleDependency: ['nestedBundleDependency'],
          authenticated: [],
        },
        anonymousPluginIds: ['anonymous'],
      }),
      isAnonymousPage: true,
    });

    expect([...pluginBundlePaths.keys()].sort()).toEqual([
      'anonymous',
      'bundleDependency',
      'nestedBundleDependency',
    ]);
  });

  it('returns required plugins of bundle-only dependencies', () => {
    const pluginBundlePaths = getPluginsBundlePaths({
      bundlesHref: '/regular-bundle-path',
      uiPlugins: createUiPlugins({
        requiredBundles: {
          anonymous: ['standaloneBundle'],
        },
        requiredPlugins: {
          standaloneBundle: ['standaloneBundleDependency'],
        },
        anonymousPluginIds: ['anonymous'],
      }),
      isAnonymousPage: true,
    });

    expect([...pluginBundlePaths.keys()].sort()).toEqual([
      'anonymous',
      'standaloneBundle',
      'standaloneBundleDependency',
    ]);
  });
});
