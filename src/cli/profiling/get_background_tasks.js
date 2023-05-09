/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

module.exports = { getBackgroundPlugins };

const AddOptional = !true;

/** @typedef { { pluginName: string, optionalPlugins: Set<string>, requiredPlugins: Set<string> } } Plugin */
/** @type { (pluginsMap: Map<string, Plugin>) => Set<string> } */
function getBackgroundPlugins(pluginsMap) {
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

/** @type { (pluginName: string, result: Set<string>, processed: Set<string> ) => Set<string>} */
function getAllRequiredPlugins(pluginsMap, pluginName, result, processed) {
  /** @type { Set<string> } */
  if (!result) result = new Set();
  if (!processed) processed = new Set();

  const plugin = pluginsMap.get(pluginName);
  for (const dep of plugin.requiredPlugins) {
    if (processed.has(dep)) continue;
    result.add(dep);
    processed.add(dep);
    getAllRequiredPlugins(pluginsMap, dep, result, processed);
  }

  if (AddOptional) {
    for (const dep of plugin.optionalPlugins) {
      if (processed.has(dep)) continue;
      result.add(dep);
      processed.add(dep);
      getAllRequiredPlugins(dep, result, processed);
    }
  }

  return result;
}

/** @type { (pluginsMap: Map<string, Plugin>, pluginName: string) => Set<string>} */
function getDependentPlugins(pluginsMap, pluginName) {
  /** @type { Set<string> } */
  const result = new Set();
  const queue = [pluginName];

  while (queue.length > 0) {
    const required = queue.shift();

    for (const plugin of pluginsMap.values()) {
      if (result.has(plugin.pluginName)) continue;

      if (plugin.requiredPlugins.has(required)) {
        result.add(plugin.pluginName);
        queue.push(plugin.pluginName);
      }

      if (AddOptional && plugin.optionalPlugins.has(required)) {
        result.add(plugin.pluginName);
        queue.push(plugin.pluginName);
      }
    }
  }

  return result;
}
