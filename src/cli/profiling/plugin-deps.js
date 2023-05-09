/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const plugins = require('./plugin-deps.json');

// try here: https://dreampuf.github.io/GraphvizOnline/

console.log(`digraph plugins {`);

for (const plugin of plugins) {
  console.log(`  _${plugin.pluginName} [label="${plugin.pluginName}"];`);
}

const addOptional = false;

for (const plugin of plugins) {
  for (const dep of plugin.requiredPlugins) {
    console.log(`  _${plugin.pluginName} -> _${dep};`);
  }

  if (addOptional) {
    for (const dep of plugin.optionalPlugins) {
      console.log(`  _${plugin.pluginName} -> _${dep};`);
    }
  }
}
console.log(`}`);
