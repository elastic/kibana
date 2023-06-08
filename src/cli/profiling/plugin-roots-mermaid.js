/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/** @typedef { { pluginName: string, optionalPlugins: string[], requiredPlugins: string[] } } Plug */
/** @typedef { { pluginName: string, optionalPlugins: Set<string>, requiredPlugins: Set<string> } } Plugg */
/** @typedef { Map<string, Plugg> } PluggMap */

/** @type { Plug[] } */
const { getBackgroundPlugins } = require('./get_background_tasks');
const originalPlugins = require('./plugin-deps.json');

/** @type { Map<string, Plugg> } */
const plugins = new Map(
  originalPlugins.map((plugin) => [
    plugin.pluginName,
    {
      pluginName: plugin.pluginName,
      requiredPlugins: new Set(plugin.requiredPlugins),
      optionalPlugins: new Set(plugin.optionalPlugins),
    },
  ])
);

// Mermaid: try here: https://mermaid.live/edit
console.log(`# Kibana plugin dependency by roots diagrams\n`);

const Backtics = '```';

const backgroundPlugins = getBackgroundPlugins(plugins);

const pluginNames = Array.from(backgroundPlugins.keys()).sort();
for (const pluginName of pluginNames) {
  const plugin = plugins.get(pluginName);
  console.log(`
## ${plugin.pluginName}

${Backtics}mermaid
${mermaidRoots(plugin)}
${Backtics}
`);
}

/** @type { (plugin: Plugg) => string } */
function mermaidRoots(plugin) {
  /** @type { Set<strig> } */
  const lines = [];
  lines.push(`stateDiagram`);
  lines.push(`direction TB`);
  lines.push(`accTitle: ${plugin.pluginName} dependency roots`);

  // eliminate dups
  const depLines = Array.from(new Set(getMermaidRootLines(plugin.pluginName))).sort();

  return lines.concat(depLines).join('\n');
}

/** @type { (pluginName: string) => string[] } */
function getMermaidRootLines(pluginName, result, processed) {
  /** @type { string[] } */
  if (!result) result = [];
  /** @type { Set<string> } */
  if (!processed) processed = new Set();

  const plugin = plugins.get(pluginName);
  if (!plugin) return [];

  if (processed.has(plugin.pluginName)) return result;
  processed.add(plugin.pluginName);

  for (const plug of plugins.values()) {
    if (plug.requiredPlugins.has(plugin.pluginName)) {
      result.push(`  _${plug.pluginName} --> _${plugin.pluginName}`);
      getMermaidRootLines(plug.pluginName, result, processed);
    }

    if (plug.optionalPlugins.has(plugin.pluginName)) {
      result.push(`  _${plug.pluginName} --> _${plugin.pluginName}`);
      getMermaidRootLines(plug.pluginName, result, processed);
    }
  }

  return result;
}
