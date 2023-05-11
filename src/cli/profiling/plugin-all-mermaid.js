/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

//@ts-check

/** @typedef { { pluginName: string, optionalPlugins: string[], requiredPlugins: string[] } } OrigPlugin */
/** @typedef { { name: string, requires: Set<string>, requiredBy: Set<string> } } Plugin */
/** @typedef { Map<string, Plugin> } PluginMap */

/** @type { OrigPlugin[] } */
const originalPlugins = require('./plugin-deps.json');

// build starting map of plugins, without requiredBy relationships
/** @type { PluginMap } */
const plugins = new Map(
  originalPlugins.map((plugin) => [
    plugin.pluginName,
    {
      name: plugin.pluginName,
      requires: new Set(plugin.requiredPlugins.concat(plugin.optionalPlugins)),
      requiredBy: new Set(),
    },
  ])
);

// add requiredBy relationships
for (const plugin of plugins.values()) {
  for (const depName of plugin.requires) {
    const dep = plugins.get(depName);
    if (!dep) continue;
    dep.requiredBy.add(plugin.name);
  }
}

// Mermaid: try here: https://mermaid.live/edit
console.log(`# Kibana plugin dependency diagrams\n`);

const Backtics = '```';

const pluginNames = Array.from(plugins.keys()).sort();
for (const pluginName of pluginNames) {
  const plugin = plugins.get(pluginName);
  if (plugin == null) continue;

  console.log(`
## ${plugin.name}

${Backtics}mermaid
${graphData(plugin)}
${Backtics}
`);
}

/** @type { (plugin: Plugin) => string } */
function graphData(plugin) {
  /** @type { string[] } */
  const lines = [];
  lines.push(`stateDiagram`);
  lines.push(`direction TB`);
  lines.push(`accTitle: ${plugin.name} dependencies`);
  lines.push(
    `accDescr: red: this plugin; blue: required by this plugin; green: requires this plugin`
  );
  lines.push(`classDef requires   fill:#ccf,stroke:#333,stroke-width:2px;`);
  lines.push(`classDef requiredBy fill:#cfc,stroke:#333,stroke-width:2px;`);
  lines.push(`classDef focus      fill:#fcc,stroke:#333,stroke-width:2px;`);

  const requiresLines = getRequiresLines(plugin.name);
  const requiredByLines = getRequiredByLines(plugin.name);

  // eliminate dups
  const depLines = Array.from(new Set(requiresLines.concat(requiredByLines))).sort();

  return lines.concat(depLines).join('\n');
}

/** @type { (pluginName: string, result?: string[], processed?: Set<string>, originalPluginName?: string) => string[] } */
function getRequiresLines(
  pluginName,
  result = [],
  processed = new Set(),
  originalPluginName = pluginName
) {
  const plugin = plugins.get(pluginName);
  if (!plugin) return [];

  if (processed.has(plugin.name)) return result;
  processed.add(plugin.name);

  const label = originalPluginName === plugin.name ? 'focus' : `requires`;

  for (const depName of plugin.requires) {
    result.push(`  ${plugin.name}:::${label} --> ${depName}:::requires`);
    getRequiresLines(depName, result, processed, originalPluginName);
  }

  return result;
}

/** @type { (pluginName: string, result?: string[], processed?: Set<string>, originalPluginName?: string) => string[] } */
function getRequiredByLines(
  pluginName,
  result = [],
  processed = new Set(),
  originalPluginName = pluginName
) {
  if (!result) result = [];
  if (!processed) processed = new Set();
  if (!originalPluginName) originalPluginName = pluginName;

  const plugin = plugins.get(pluginName);
  if (!plugin) return [];

  if (processed.has(plugin.name)) return result;
  processed.add(plugin.name);

  const label = originalPluginName === plugin.name ? 'focus' : `requiredBy`;

  for (const depName of plugin.requiredBy) {
    result.push(`  ${depName}:::requiredBy --> ${plugin.name}:::${label}`);
    getRequiredByLines(depName, result, processed, originalPluginName);
  }

  return result;
}

/*
to generate the compiled-to-svg diagrams for this:


  npm install -g @mermaid-js/mermaid-cli 
  node src/cli/profiling/plugin-all-mermaid.js > src/cli/profiling/mermaid/plugin-all-mermaid.template.md
  mmdc -i src/cli/profiling/mermaid/plugin-all-mermaid.template.md -o src/cli/profiling/mermaid/plugin-all-mermaid.md
*/
