/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface PluginEntry {
  /** Unique plugin identifier (e.g., 'dashboard', 'discover') */
  id: string;
  /** Package ID for imports (e.g., '@kbn/dashboard-plugin') */
  pkgId: string;
  /** Absolute path to the plugin source directory */
  contextDir: string;
  /**
   * Directories within the plugin that are exposed as public entry points
   * (e.g., ['public', 'common']). Derived from 'public' + manifest
   * plugin.extraPublicDirs.
   *
   * In the legacy webpack optimizer, each target gets a separate
   * __kbnBundles__.define('plugin/{id}/{target}', ...) registration,
   * allowing other plugins to import from those directories at runtime.
   *
   * The rspack single-compilation model currently only registers
   * 'plugin/{id}/public'. Registering extra targets will be needed
   * for full parity with the legacy optimizer, particularly for
   * external/third-party plugins that rely on
   * __kbnBundles__.get('plugin/{id}/{target}') for non-public dirs.
   */
  targets: string[];
  /**
   * Plugin IDs this plugin depends on.
   * Once the legacy webpack optimizer is removed, consider reading this
   * directly from PluginPackage.manifest when needed (e.g. --focus dependency
   * expansion) rather than carrying it on PluginEntry.
   */
  requiredPlugins: string[];
  /**
   * Bundle IDs this plugin depends on (non-plugin bundles).
   * Once the legacy webpack optimizer is removed, this field is likely
   * unnecessary -- the rspack single-compilation model does not need
   * per-bundle script loading, and core's getPluginBundlePaths would
   * be simplified to load the unified bundle instead.
   */
  requiredBundles: string[];
  /** Path to kibana.jsonc manifest */
  manifestPath: string;
  /** Bundle type */
  type: 'plugin' | 'entry';
  /** Page load asset size limit in bytes */
  pageLoadAssetSizeLimit?: number;
  /** Whether to ignore metrics for this bundle */
  ignoreMetrics: boolean;
}

export interface ThemeConfig {
  /** Theme tags to build (e.g., ['borealislight', 'borealisdark']) */
  tags: string[];
  /** Path to theme globals */
  globalsPath: string;
}

export interface BundleRemote {
  bundleType: string;
  bundleId: string;
  pkgId: string;
  targets: readonly string[];
}

export type ThemeTag = 'borealislight' | 'borealisdark';
