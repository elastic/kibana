/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// ============================================================================
// HYBRID MODE (DEFAULT) - Optimal bundle sizes + isolated builds
// ============================================================================
export {
  createSharedContainerConfig,
  SHARED_CONTAINER_NAME,
  type SharedContainerConfigOptions,
} from './config/create_shared_container_config';
export {
  createHybridPluginConfigs,
  type HybridPluginConfigOptions,
} from './config/create_hybrid_plugin_config';
export {
  ALL_SHARED_DEPS,
  CORE_DEPS,
  ELASTIC_DEPS,
  KBN_PLATFORM_DEPS,
  generateExternalsConfig,
  generateContainerExposes,
  type SharedDep,
} from './config/shared_deps';
export {
  runHybridBuild,
  type HybridBuildOptions,
  type HybridBuildResult,
} from './run_hybrid_build';

// ============================================================================
// SINGLE COMPILATION - Fastest full build (no isolated builds)
// ============================================================================
export {
  createSingleCompileConfig,
  type SingleCompileConfigOptions,
} from './config/create_single_compile_config';
export {
  createSingleRspackConfig,
  type SingleRspackConfigOptions,
} from './config/create_single_rspack_config';
export {
  runSingleRspackBuild,
  type SingleBuildOptions,
  type SingleBuildResult,
} from './run_single_rspack_build';

// ============================================================================
// LEGACY MODE - For gradual migration
// ============================================================================
export { createRspackConfig, type RspackConfigOptions } from './config/create_rspack_config';
export {
  createPluginRspackConfig,
  type PluginRspackConfigOptions,
} from './config/create_plugin_rspack_config';
export { runRspackBuild, type BuildOptions, type BuildResult } from './run_rspack_build';

// ============================================================================
// PLUGINS
// ============================================================================
export { BundleMetricsPlugin } from './plugins/bundle_metrics_plugin';
export { KbnBundleRefsPlugin } from './plugins/kbn_bundle_refs_plugin';
export { OutputRouterPlugin } from './plugins/output_router_plugin';
export { KbnEntryWrapperPlugin } from './plugins/kbn_entry_wrapper_plugin';

// ============================================================================
// UTILITIES
// ============================================================================
export { discoverPlugins, type PluginEntry } from './utils/plugin_discovery';
export { collectBundleMetrics, type BundleMetric } from './utils/metrics';

// ============================================================================
// RUNTIME
// ============================================================================
export {
  createKibanaMFRuntime,
  initializeKibanaMFRuntime,
  loadKibanaPlugin,
  generateBootstrapTemplate,
  type KibanaMFRuntime,
  type PluginDefinition,
  type BootstrapTemplateData,
} from './runtime';

// ============================================================================
// CLI & DEV MODE
// ============================================================================
export { runRspackCli, type CliOptions } from './cli';
export {
  RspackOptimizer,
  type RspackOptimizerOptions,
  type OptimizerPhase,
} from './rspack_optimizer';

// Re-export useful types
export type { Configuration, Stats, Compiler, RspackPluginInstance } from '@rspack/core';
