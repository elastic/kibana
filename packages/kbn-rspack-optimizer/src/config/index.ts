/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Hybrid approach (DEFAULT) - shared container + optimized plugins
export {
  createSharedContainerConfig,
  SHARED_CONTAINER_NAME,
  SHARED_CHUNKS,
  type SharedContainerConfigOptions,
} from './create_shared_container_config';
export {
  createHybridPluginConfigs,
  type HybridPluginConfigOptions,
} from './create_hybrid_plugin_config';
export {
  ALL_SHARED_DEPS,
  CORE_DEPS,
  ELASTIC_DEPS,
  KBN_PLATFORM_DEPS,
  generateExternalsConfig,
  generateContainerExposes,
  type SharedDep,
} from './shared_deps';
export {
  discoverSharedDeps,
  CORE_SHARED_DEPS,
  COMMON_SHARED_DEPS,
  type DiscoveryOptions,
  type DiscoveredDeps,
} from './shared_deps_discovery';

// Single compilation approach (fastest for full builds, no isolated support)
export {
  createSingleRspackConfig,
  type SingleRspackConfigOptions,
} from './create_single_rspack_config';

// Original Module Federation approach (deprecated)
export {
  createMFRspackConfig,
  type MFRspackConfigOptions,
} from './create_mf_rspack_config';
export {
  createHostMFConfig,
  createPluginMFConfig,
  getSharedDependencies,
} from './module_federation';

// External/third-party plugin support
export {
  createExternalPluginConfig,
  type ExternalPluginConfigOptions,
} from './create_external_plugin_config';

// Shared configuration (used by both main build and external plugins)
export {
  getSharedResolveConfig,
  getSharedResolveFallback,
  getSharedModuleRules,
  getSharedIgnoreWarnings,
  getBabelLoaderRule,
  getScssLoaderRule,
} from './shared_config';

// Legacy approach (bundle refs)
export { createRspackConfig, type RspackConfigOptions } from './create_rspack_config';
export {
  createPluginRspackConfig,
  type PluginRspackConfigOptions,
} from './create_plugin_rspack_config';
export { getExternals } from './externals';
export { createThemeRules } from './theme_rules';
