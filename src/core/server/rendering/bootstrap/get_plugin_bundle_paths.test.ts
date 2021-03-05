/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { UiPlugins } from '../../plugins';
import { getPluginsBundlePaths } from './get_plugin_bundle_paths';

const createUiPlugins = (pluginDeps: Record<string, string[]>) => {
  const uiPlugins: UiPlugins = {
    internal: new Map(),
    public: new Map(),
    browserConfigs: new Map(),
  };

  Object.entries(pluginDeps).forEach(([pluginId, deps]) => {
    uiPlugins.internal.set(pluginId, {
      requiredBundles: deps,
      publicTargetDir: '',
      publicAssetsDir: '',
    } as any);
    uiPlugins.public.set(pluginId, {
      id: pluginId,
      configPath: 'config-path',
      optionalPlugins: [],
      requiredPlugins: [],
      requiredBundles: deps,
    });
  });

  return uiPlugins;
};

describe('getPluginsBundlePaths', () => {
  it('returns an entry for each plugin and their bundle dependencies', () => {
    const pluginBundlePaths = getPluginsBundlePaths({
      regularBundlePath: '/regular-bundle-path',
      uiPlugins: createUiPlugins({
        a: ['b', 'c'],
        b: ['d'],
      }),
    });

    expect([...pluginBundlePaths.keys()].sort()).toEqual(['a', 'b', 'c', 'd']);
  });

  it('returns correct paths for each bundle', () => {
    const pluginBundlePaths = getPluginsBundlePaths({
      regularBundlePath: '/regular-bundle-path',
      uiPlugins: createUiPlugins({
        a: ['b'],
      }),
    });

    expect(pluginBundlePaths.get('a')).toEqual({
      bundlePath: '/regular-bundle-path/plugin/a/a.plugin.js',
      publicPath: '/regular-bundle-path/plugin/a/',
    });

    expect(pluginBundlePaths.get('b')).toEqual({
      bundlePath: '/regular-bundle-path/plugin/b/b.plugin.js',
      publicPath: '/regular-bundle-path/plugin/b/',
    });
  });
});
