/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import Fs from 'fs';
import { getPackages, getPluginPackagesFilter, type PluginPackage } from '@kbn/repo-packages';

/**
 * Information about a discovered UI plugin
 */
export interface PluginInfo {
  /** Plugin ID */
  id: string;
  /** Plugin directory path */
  directory: string;
  /** Path to public directory */
  publicDir: string;
  /** Extra public directories for code splitting */
  extraPublicDirs: string[];
  /** Required plugin IDs */
  requiredPlugins: string[];
  /** Required bundle IDs */
  requiredBundles: string[];
}

/**
 * Options for plugin discovery
 */
export interface DiscoverPluginsOptions {
  /** Include example plugins */
  examples?: boolean;
  /** Include test plugins */
  testPlugins?: boolean;
  /** Filter to specific plugin IDs */
  filter?: string[];
}

/**
 * Discover UI plugins that have a public directory
 *
 * @param repoRoot Root directory of the Kibana repository
 * @param options Discovery options
 * @returns Array of discovered plugin info
 */
export function discoverUiPlugins(repoRoot: string, options: DiscoverPluginsOptions): PluginInfo[] {
  const { examples = false, testPlugins = false, filter } = options;
  const packages = getPackages(repoRoot);
  const pluginFilter = getPluginPackagesFilter({ examples, testPlugins, browser: true });
  const plugins = packages.filter(pluginFilter) as PluginPackage[];

  return plugins
    .filter((pkg) => !filter || filter.length === 0 || filter.includes(pkg.manifest.plugin.id))
    .map((pkg) => ({
      id: pkg.manifest.plugin.id,
      directory: pkg.directory,
      publicDir: Path.resolve(pkg.directory, 'public'),
      extraPublicDirs: pkg.manifest.plugin.extraPublicDirs || [],
      requiredPlugins: pkg.manifest.plugin.requiredPlugins || [],
      requiredBundles: pkg.manifest.plugin.requiredBundles || [],
    }))
    .filter((plugin) => Fs.existsSync(plugin.publicDir));
}
