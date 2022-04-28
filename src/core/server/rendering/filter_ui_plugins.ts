/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { UiPlugins } from '../plugins';

/**
 * Gets the array of plugins that should be enabled on the page.
 *  * If this _is not_ an anonymous page, all plugins will be enabled.
 *  * If this _is_ an anonymous page, only plugins that have "enabledOnAnonymousPages" set in their manifest *and* the graph of their
 *    requiredPlugins will be enabled.
 */
export function filterUiPlugins({
  uiPlugins,
  isAnonymousPage,
}: {
  uiPlugins: UiPlugins;
  isAnonymousPage: boolean;
}) {
  if (!isAnonymousPage) {
    return [...uiPlugins.public];
  }
  const pluginsToProcess = [...uiPlugins.public].reduce<string[]>((acc, [id, plugin]) => {
    if (plugin.enabledOnAnonymousPages) {
      acc.push(id);
    }
    return acc;
  }, []);

  const pluginsToInclude = new Set<string>();
  while (pluginsToProcess.length > 0) {
    const pluginId = pluginsToProcess.pop() as string;
    const plugin = uiPlugins.public.get(pluginId);
    if (!plugin) {
      continue;
    }
    pluginsToInclude.add(pluginId);
    for (const requiredPluginId of plugin.requiredPlugins) {
      if (!pluginsToInclude.has(requiredPluginId)) {
        pluginsToProcess.push(requiredPluginId);
      }
    }
  }
  // Filter the plugins, maintaining the order (that is important)
  return [...uiPlugins.public].filter(([id]) => pluginsToInclude.has(id));
}
