/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginWrapper } from './plugin';

const AddOptionalPlugins = true;

interface Plugin {
  name: string;
  deps: Set<string>;
}

type PluginsMap = Map<string, Plugin>;

export function getBackgroundPlugins(plugins: PluginWrapper[]) {
  const pluginsMap: PluginsMap = new Map(
    plugins.map((p) => {
      const deps = !AddOptionalPlugins
        ? p.requiredPlugins
        : p.requiredPlugins.concat(p.optionalPlugins);
      return [p.name, { name: p.name, deps: new Set(deps) }];
    })
  );

  const dependentPlugins = getDependentPlugins(pluginsMap, 'taskManager');
  const result = new Set();

  for (const plugin of dependentPlugins) {
    const required = getAllRequiredPlugins(pluginsMap, plugin);
    for (const req of required) {
      result.add(req);
    }
  }

  return result;
}

function getAllRequiredPlugins(
  pluginsMap: PluginsMap,
  pluginName: string,
  result: Set<string> = new Set(),
  processed: Set<string> = new Set()
) {
  const plugin = pluginsMap.get(pluginName);
  if (plugin == null) return result;

  for (const dep of plugin.deps) {
    if (processed.has(dep)) continue;
    result.add(dep);
    processed.add(dep);
    getAllRequiredPlugins(pluginsMap, dep, result, processed);
  }

  return result;
}

function getDependentPlugins(pluginsMap: PluginsMap, pluginName: string): Set<string> {
  const result = new Set<string>();
  const queue = [pluginName];

  while (queue.length > 0) {
    const required = queue.shift();
    if (!required) break;

    for (const plugin of pluginsMap.values()) {
      if (result.has(plugin.name)) continue;

      if (plugin.deps.has(required)) {
        result.add(plugin.name);
        queue.push(plugin.name);
      }
    }
  }

  return result;
}
