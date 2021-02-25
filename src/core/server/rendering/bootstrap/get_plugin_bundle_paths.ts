/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { UiPlugins } from '../../plugins';

interface PluginInfo {
  publicPath: string;
  bundlePath: string;
}

export const getPluginsBundlePaths = ({
  uiPlugins,
  regularBundlePath,
}: {
  uiPlugins: UiPlugins;
  regularBundlePath: string;
}) => {
  const pluginBundlePaths = new Map<string, PluginInfo>();

  const readPlugins = (pluginIds: readonly string[]) => {
    for (const pluginId of pluginIds) {
      if (pluginBundlePaths.has(pluginId)) {
        continue;
      }
      pluginBundlePaths.set(pluginId, {
        publicPath: `${regularBundlePath}/plugin/${pluginId}/`,
        bundlePath: `${regularBundlePath}/plugin/${pluginId}/${pluginId}.plugin.js`,
      });

      readPlugins(uiPlugins.internal.get(pluginId)!.requiredBundles);
    }
  };

  readPlugins([...uiPlugins.public.keys()]);

  return pluginBundlePaths;
};
