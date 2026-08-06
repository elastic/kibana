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
} from './create_single_compile_config';

export {
  createExternalPluginConfig,
  type ExternalPluginConfigOptions,
} from './create_external_plugin_config';

export { getExternals } from './externals';

export {
  getSharedResolveConfig,
  getSharedResolveFallback,
  getSharedModuleRules,
  getSharedIgnoreWarnings,
  computeConfigHash,
  getMinimizer,
} from './shared_config';

export { getSplitChunksCacheGroups, getSharedChunkNames } from './split_chunks';
