/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { REPO_ROOT } from '../../lib/paths.mjs';

/** @type {string} */
const PLUGIN_DISCOVERY_SRC = '../../../../packages/kbn-plugin-discovery/index.js';

/**
 * @param {string} pluginId
 * @returns {string}
 */
export function convertPluginIdToPackageId(pluginId) {
  if (pluginId === 'core') {
    // core is the only non-plugin
    return `@kbn/core`;
  }

  return `@kbn/${pluginId
    .split('')
    .flatMap((c) => (c.toUpperCase() === c ? `-${c.toLowerCase()}` : c))
    .join('')}-plugin`
    .replace(/-\w(-\w)+-/g, (match) => `-${match.split('-').join('')}-`)
    .replace(/-plugin-plugin$/, '-plugin');
}

/**
 * @returns {Promise<import('@kbn/plugin-discovery').KibanaPlatformPlugin[]>}
 */
export async function pluginDiscovery() {
  /* eslint-disable no-unsanitized/method */
  /** @type {import('@kbn/plugin-discovery')} */
  const { getPluginSearchPaths, simpleKibanaPlatformPluginDiscovery } = await import(
    PLUGIN_DISCOVERY_SRC
  );
  /* eslint-enable no-unsanitized/method */

  const searchPaths = getPluginSearchPaths({
    rootDir: REPO_ROOT,
    examples: true,
    oss: false,
    testPlugins: true,
  });

  return simpleKibanaPlatformPluginDiscovery(searchPaths, []);
}
