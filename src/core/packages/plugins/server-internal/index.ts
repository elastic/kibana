/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { PluginsService, PluginWrapper, config } from './src';
export type {
  InternalPluginsServiceSetup,
  InternalPluginsServiceStart,
  DiscoveredPlugins,
  PluginDependencies,
} from './src';

// Module loader exports for Vite server-side support
export {
  RequireModuleLoader,
  DynamicImportModuleLoader,
  createDefaultModuleLoader,
  setGlobalModuleLoader,
  getGlobalModuleLoader,
  resolvePluginServerPath,
} from './src';
export type { ModuleLoader } from './src';

// ViteModuleLoader types - implementation is in @kbn/vite-server (pre-compiled ESM)
// To use ViteModuleLoader: const { createViteModuleLoader } = await import('@kbn/vite-server');
export type { PluginHmrRegistration, PluginHmrUpdateEvent, PluginHmrCallback } from './src';
