/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const AddOptional = !true;

/** @typedef { { pluginName: string, optionalPlugins: string[], requiredPlugins: string[] } } Plug */
/** @typedef { { pluginName: string, optionalPlugins: Set<string>, requiredPlugins: Set<string> } } Plugg */
/** @typedef { Map<string, Plugg> } PluggMap */

/** @type { Plug[] } */
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

// const foregroundPlugins = getForegroundPlugins(plugins);
// console.log(`# foreground plugins: ${foregroundPlugins.size} / ${plugins.length}`);

// Mermaid: try here: https://mermaid.live/edit
console.log(`# Kibana plugin dependency diagrams\n`);

const Backtics = '```';

const pluginNames = Array.from(plugins.keys()).sort();
for (const pluginName of pluginNames) {
  const plugin = plugins.get(pluginName);
  console.log(`
## ${plugin.pluginName}

${Backtics}mermaid
${mermaidDeps(plugin)}
${Backtics}
`);
}

/** @type { (plugin: Plugg) => string } */
function mermaidDeps(plugin) {
  /** @type { Set<strig> } */
  const lines = [];
  lines.push(`stateDiagram`);
  lines.push(`direction TB`);
  lines.push(`accTitle: ${plugin.pluginName} dependencies`);

  // eliminate dups
  const depLines = Array.from(new Set(getMermaidDepLines(plugin.pluginName))).sort();

  return lines.concat(depLines).join('\n');
}

/** @type { (pluginName: string) => string[] } */
function getMermaidDepLines(pluginName, result, processed) {
  /** @type { string[] } */
  if (!result) result = [];
  /** @type { Set<string> } */
  if (!processed) processed = new Set();

  const plugin = plugins.get(pluginName);
  if (!plugin) return [];

  processed.add(plugin.pluginName);
  for (const dep of plugin.requiredPlugins) {
    result.push(`  _${plugin.pluginName} --> _${dep}`);
    getMermaidDepLines(dep, result, processed);
  }

  if (AddOptional) {
    for (const dep of plugin.optionalPlugins) {
      result.push(`  _${plugin.pluginName} --> _${dep}`);
      getMermaidDepLines(dep, result, processed);
    }
  }

  return result;
}

/** @type { (plugins: PluggMap ) => Set<string> } */
function getForegroundPlugins(plugins) {
  const unknown = new Set(plugins.keys());
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

    const plug = plugins.get(plugin);
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
