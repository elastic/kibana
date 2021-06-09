/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { UiPlugins } from '../../plugins';

export interface PluginInfo {
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
  const pluginsToProcess = [...uiPlugins.public.keys()];

  while (pluginsToProcess.length > 0) {
    const pluginId = pluginsToProcess.pop() as string;
    const plugin = uiPlugins.internal.get(pluginId);
    if (!plugin) {
      continue;
    }
    const { version } = plugin;

    pluginBundlePaths.set(pluginId, {
      publicPath: `${regularBundlePath}/plugin/${pluginId}/${version}/`,
      bundlePath: `${regularBundlePath}/plugin/${pluginId}/${version}/${pluginId}.plugin.js`,
    });

    const pluginBundleIds = uiPlugins.internal.get(pluginId)?.requiredBundles ?? [];
    pluginBundleIds.forEach((bundleId) => {
      if (!pluginBundlePaths.has(bundleId)) {
        pluginsToProcess.push(bundleId);
      }
    });
  }

  return pluginBundlePaths;
};
