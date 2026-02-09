/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Main exports
export { ViteServer, createViteServerRuntime } from './src/vite_server.ts';
export { createModuleRunner, resolveModulePath } from './src/module_runner.ts';
export { createServerRuntimeConfig } from './src/server_config.ts';
export { HmrHandler, createHmrHandler } from './src/hmr_handler.ts';
export { kbnCacheResolverPlugin } from './src/cache_resolver_plugin.ts';
export { kbnTransformDiskCachePlugins } from './src/transform_disk_cache_plugin.ts';
export { kbnTypescriptTransformPlugin } from './src/kbn_typescript_transform_plugin.ts';

// ViteModuleLoader - module loader for use in Kibana core
export { ViteModuleLoader, createViteModuleLoader } from './src/vite_module_loader.ts';

// Utilities
export { createViteLogger } from './src/types.ts';

// Type exports
export type {
  ViteServerOptions,
  ViteServerLog,
  ViteModuleRunner,
  ModuleExecuteResult,
  HmrContext,
  HmrPluginLifecycle,
  KbnViteDevServer,
} from './src/types.ts';

// HMR type exports
export type {
  HmrPluginInfo,
  HmrUpdateEvent,
  HmrUpdateCallback,
  HmrHandlerOptions,
} from './src/hmr_handler.ts';

// ViteModuleLoader type exports
export type {
  ModuleLoader,
  PluginHmrRegistration,
  PluginHmrUpdateEvent,
  PluginHmrCallback,
  ViteModuleLoaderOptions,
} from './src/vite_module_loader.ts';
