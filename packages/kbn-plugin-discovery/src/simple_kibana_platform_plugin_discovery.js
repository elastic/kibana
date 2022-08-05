/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { parseKibanaPlatformPlugin } = require('./parse_kibana_platform_plugin');
const { findFiles } = require('./find_files');

/**
 * Helper to find the new platform plugins.
 * @param {string[]} scanDirs
 * @param {string[]} pluginPaths
 * @returns {Array<import('./types').KibanaPlatformPlugin>}
 */
function simpleKibanaPlatformPluginDiscovery(scanDirs, pluginPaths) {
  return Array.from(
    new Set([
      // find kibana.json files up to 5 levels within each scan dir
      ...scanDirs.flatMap((dir) => findFiles(dir, 5, 'kibana.json')),
      // find kibana.json files at the root of each plugin path
      ...pluginPaths.flatMap((path) => findFiles(path, 0, 'kibana.json')),
    ])
  ).map(parseKibanaPlatformPlugin);
}

module.exports = { simpleKibanaPlatformPluginDiscovery };
