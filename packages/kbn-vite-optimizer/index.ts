/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * @kbn/vite-optimizer
 *
 * This package is the Vite-based replacement for @kbn/optimizer.
 * It provides the build system for Kibana plugin bundles.
 *
 * NOTE: This package is under development as part of the Vite migration.
 * The webpack-based @kbn/optimizer is still the primary build system.
 */

export {
  runOptimizer,
  type OptimizerConfig,
  type OptimizerEvent,
  type PluginBuildResult,
  type PluginBuildConfig,
  type PluginInfo,
  type PreloadedModules,
} from './src/optimizer';
export { buildPlugin, preloadBuildModules } from './src/build_plugin';
export { discoverUiPlugins, type DiscoverPluginsOptions } from './src/discover_plugins';
export { createDevServer, type DevServerConfig, type DevServer } from './src/dev_server';
