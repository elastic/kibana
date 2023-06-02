/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/** @typedef {import('./types').LegacyKibanaPlatformPlugin} LegacyKibanaPlatformPlugin */
/** @typedef {import('./types').LegacyKibanaPlatformPluginManifest} LegacyKibanaPlatformPluginManifest */
const {
  simpleLegacyKibanaPlatformPluginDiscovery,
} = require('./simple_kibana_platform_plugin_discovery');
const { parseLegacyKibanaPlatformPlugin } = require('./parse_kibana_platform_plugin');

module.exports = {
  simpleLegacyKibanaPlatformPluginDiscovery,
  parseLegacyKibanaPlatformPlugin,
};
