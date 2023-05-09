/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const AddOptional = !true;

/** @typedef { { pluginName: string, optionalPlugins: string[], requiredPlugins: string[] } } Plug */
/** @type { Array<Plug> } */
const originalPlugins = require('./plugin-deps.json');

const plugins = originalPlugins.map((plugin) => {
  return {
    pluginName: plugin.pluginName,
    requiredPlugins: new Set(plugin.requiredPlugins),
    optionalPlugins: new Set(plugin.optionalPlugins),
  };
});

const foregroundPlugins = getForegroundPlugins(plugins);
console.log(`# foreground plugins: ${foregroundPlugins.size} / ${plugins.length}`);

// Graphviz: try here: https://dreampuf.github.io/GraphvizOnline/
console.log(`digraph plugins {`);

for (const plugin of plugins) {
  const label = `label="${plugin.pluginName}"`;
  if (foregroundPlugins.has(plugin.pluginName)) continue;

  const color = foregroundPlugins.has(plugin.pluginName) ? ` color="#FF7777"` : '';
  console.log(`  _${plugin.pluginName} [${label}${color}];`);
}

for (const plugin of plugins) {
  if (foregroundPlugins.has(plugin.pluginName)) continue;

  for (const dep of plugin.requiredPlugins) {
    if (foregroundPlugins.has(dep)) continue;
    console.log(`  _${plugin.pluginName} -> _${dep};`);
  }

  if (AddOptional) {
    for (const dep of plugin.optionalPlugins) {
      if (foregroundPlugins.has(dep)) continue;
      console.log(`  _${plugin.pluginName} -> _${dep};`);
    }
  }
}
console.log(`}`);

/** @typedef { { pluginName: string, optionalPlugins: Set<string>, requiredPlugins: Set<string> } } Plugg */
/** @type { (plugins: Plugg[]) => Set<string> } */
function getForegroundPlugins(plugins) {
  const plugMap = new Map(plugins.map((plugin) => [plugin.pluginName, plugin]));
  const unknown = new Set(plugins.map((plugin) => plugin.pluginName));
  /** @type { Set<string> } */
  const keepers = new Set();

  let changes = 0;
  keep('taskManager');
  console.log(`# calculating foreground plugins`);
  while (changes > 0) {
    console.log(`# changes this round: ${changes}`);
    changes = 0;

    for (const plugin of plugins) {
      if (keepers.has(plugin.pluginName)) continue;

      for (const dep of plugin.requiredPlugins) {
        if (keepers.has(dep)) {
          keep(plugin.pluginName);
          break;
        }
      }

      if (AddOptional) {
        for (const dep of plugin.optionalPlugins) {
          if (keepers.has(dep)) {
            keep(plugin.pluginName);
            break;
          }
        }
      }
    }
  }

  return unknown;

  /** @type { (plugin: string) => void } */
  function keep(plugin) {
    if (keepers.has(plugin)) return;

    changes++;
    keepers.add(plugin);
    unknown.delete(plugin);

    const plug = plugMap.get(plugin);
    if (!plug) return;

    for (const dep of plug.requiredPlugins) {
      keep(dep);
    }

    if (AddOptional) {
      for (const dep of plug.optionalPlugins) {
        keep(dep);
      }
    }
  }
}
