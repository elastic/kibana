/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { getBackgroundPlugins } = require('./get_background_tasks');

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
const pluginsMap = new Map(plugins.map((plugin) => [plugin.pluginName, plugin]));

const backgroundPlugins = getBackgroundPlugins(pluginsMap);
console.log(`# background plugins: ${backgroundPlugins.size} / ${plugins.length}`);

// Graphviz: try here: https://dreampuf.github.io/GraphvizOnline/
console.log(`digraph plugins {`);

for (const plugin of plugins) {
  if (!backgroundPlugins.has(plugin.pluginName)) continue;
  const props = `label="${plugin.pluginName}" color="#FF0000" fontcolor="#00AF00"`;
  console.log(`  _${plugin.pluginName} [${props}];`);
}

for (const plugin of plugins) {
  if (!backgroundPlugins.has(plugin.pluginName)) continue;

  for (const dep of plugin.requiredPlugins) {
    if (!backgroundPlugins.has(dep)) continue;
    console.log(`  _${plugin.pluginName} -> _${dep} [color="#3F3FFF"];`);
  }

  for (const dep of plugin.optionalPlugins) {
    if (!backgroundPlugins.has(dep)) continue;
    console.log(`  _${plugin.pluginName} -> _${dep} [color="#3F3FFF"];`);
  }
}

console.log(`}`);
