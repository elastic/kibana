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
  /** Absolute path to the output directory (target/public) */
  outputDir: string;
  /** Public export targets (e.g., ['public', 'common']) */
  targets: string[];
  /** Plugin IDs this plugin depends on */
  requiredPlugins: string[];
  /** Bundle IDs this plugin depends on (non-plugin bundles) */
  requiredBundles: string[];
  /** Path to kibana.json manifest */
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
