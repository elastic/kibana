/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Main config for unified compilation
export {
  createSingleCompileConfig,
  type SingleCompileConfigOptions,
  signalShutdown,
  resetShutdown,
} from './config/create_single_compile_config';

// External plugin support (for kbn-plugin-helpers)
export {
  createExternalPluginConfig,
  type ExternalPluginConfigOptions,
} from './config/create_external_plugin_config';

// Shared config utilities
export {
  getSharedResolveConfig,
  getSharedResolveFallback,
  getSharedModuleRules,
  getSharedIgnoreWarnings,
  getScssLoaderRule,
} from './config/shared_config';

// Loaders
export { themeLoader } from './loaders';

// Externals for shared deps
export { getExternals } from './config/externals';

// Build runner
export { runBuild, type BuildOptions, type BuildResult } from './run_build';

// CLI
export { runRspackCli, type CliOptions } from './cli';

// Dev mode optimizer
export { RspackOptimizer, type RspackOptimizerOptions, type OptimizerPhase } from './optimizer';

// Plugin discovery
export { discoverPlugins, type PluginEntry } from './utils/plugin_discovery';

// Limits
export {
  readLimits,
  validateLimitsForAllBundles,
  updateBundleLimits,
  DEFAULT_LIMITS_PATH,
} from './limits';
export type { Limits } from './limits';

// Types
export type { ThemeTag } from './types';

// Re-export useful RSPack types
export type { Configuration, Stats, Compiler, RspackPluginInstance } from '@rspack/core';
