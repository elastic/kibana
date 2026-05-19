/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export {
  createSingleCompileConfig,
  type SingleCompileConfigOptions,
  signalShutdown,
  resetShutdown,
} from './config/create_single_compile_config';
export {
  createExternalPluginConfig,
  type ExternalPluginConfigOptions,
} from './config/create_external_plugin_config';
export {
  getSharedResolveConfig,
  getSharedResolveFallback,
  getSharedModuleRules,
  getSharedIgnoreWarnings,
  getScssLoaderRule,
} from './config/shared_config';
export { themeLoader } from './loaders';
export { getExternals } from './config/externals';
export { runBuild, type BuildOptions, type BuildResult } from './run_build';
export { runRspackCli, type CliOptions } from './cli';
export { RspackOptimizer, type RspackOptimizerOptions, type OptimizerPhase } from './optimizer';
export { discoverPlugins, type PluginEntry } from './utils/plugin_discovery';
export {
  readLimits,
  validateLimitsForAllBundles,
  updateBundleLimits,
  DEFAULT_LIMITS_PATH,
} from './limits';
export type { Limits } from './limits';
export type { ThemeTag } from './types';
export type { Configuration, Stats, Compiler, RspackPluginInstance } from '@rspack/core';
