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
import { getPackages, getPluginPackagesFilter } from '@kbn/repo-packages';
import type { PluginPackage } from '@kbn/repo-packages';
import type { PluginEntry } from '../types';

export type { PluginEntry };

export interface DiscoverPluginsOptions {
  repoRoot: string;
  examples?: boolean;
  testPlugins?: boolean;
}

const isDefaultPlugin = getPluginPackagesFilter();

/**
 * Convert a PluginPackage into a PluginEntry, or return null if the plugin
 * does not have a public/ directory (no UI bundle to build).
 */
function toPluginEntry(repoRoot: string, pkg: PluginPackage): PluginEntry | null {
  const contextDir = Path.resolve(repoRoot, pkg.normalizedRepoRelativeDir);
  if (!Fs.existsSync(Path.join(contextDir, 'public'))) {
    return null;
  }

  return {
    id: pkg.manifest.plugin.id,
    pkgId: pkg.manifest.id,
    contextDir,
    targets: ['public', ...(pkg.manifest.plugin.extraPublicDirs ?? [])],
    requiredPlugins: pkg.manifest.plugin.requiredPlugins ?? [],
    requiredBundles: pkg.manifest.plugin.requiredBundles ?? [],
    manifestPath: Path.resolve(contextDir, 'kibana.jsonc'),
    type: 'plugin',
    ignoreMetrics: !isDefaultPlugin(pkg),
  };
}

/**
 * Discover all Kibana plugins with UI bundles using the repo package map.
 */
export async function discoverPlugins(options: DiscoverPluginsOptions): Promise<PluginEntry[]> {
  const { repoRoot, examples = false, testPlugins = false } = options;

  const pluginFilter = getPluginPackagesFilter({ examples, testPlugins, browser: true });

  const plugins: PluginEntry[] = [];
  for (const pkg of getPackages(repoRoot)) {
    if (!pluginFilter(pkg)) {
      continue;
    }

    const entry = toPluginEntry(repoRoot, pkg as PluginPackage);
    if (entry) {
      plugins.push(entry);
    }
  }

  return plugins;
}

/**
 * Resolve the absolute path to package-map.json from @kbn/repo-packages.
 * Used by the watch plugin to detect new/removed packages.
 */
export function getPackageMapPath(): string {
  return Path.resolve(Path.dirname(require.resolve('@kbn/repo-packages')), 'package-map.json');
}

/**
 * Create the core entry configuration.
 */
export function createCoreEntry(repoRoot: string): PluginEntry {
  return {
    id: 'core',
    pkgId: '@kbn/core',
    contextDir: Path.resolve(repoRoot, 'src/core'),
    targets: ['public'],
    requiredPlugins: [],
    requiredBundles: [],
    manifestPath: '',
    type: 'entry',
    ignoreMetrics: false,
  };
}
