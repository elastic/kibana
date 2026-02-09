/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Base configuration
export {
  createKbnViteConfig,
  createKbnBrowserConfig,
  createKbnNodeConfig,
  type KbnViteConfigOptions,
} from './src/base_config.js';

// Resolver plugins
export {
  kbnResolverPlugin,
  kbnLegacyImportsPlugin,
  kbnSpecialModulesPlugin,
  readPackageMap,
  generateKbnAliases,
  type KbnResolverPluginOptions,
} from './src/kbn_resolver_plugin.js';

// Externals and bundle remotes
export {
  kbnExternalsPlugin,
  kbnBundleRemotesPlugin as kbnSimpleBundleRemotesPlugin,
  DEFAULT_SHARED_EXTERNALS,
  type SharedDepsConfig,
  type BundleRemotesConfig,
} from './src/kbn_externals_plugin.js';

// Advanced bundle remotes (full implementation)
export {
  kbnBundleRemotesPlugin,
  parseKbnImportReq,
  readBundleDeps,
  createBundleRemotesMap,
  type BundleRemote,
  type KbnBundleRemotesPluginOptions,
} from './src/kbn_bundle_remotes_plugin.js';

// Style and asset handling
export {
  kbnStylesPlugin,
  kbnPeggyPlugin,
  kbnDotTextPlugin,
  kbnRawPlugin,
  DEFAULT_THEME_TAGS,
  type KbnStylesPluginOptions,
} from './src/kbn_styles_plugin.js';
