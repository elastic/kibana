/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';

import { getPackages, getPluginPackagesFilter, type Package } from '@kbn/repo-packages';
import { REPO_ROOT } from '@kbn/repo-info';
import type { PluginOrPackage } from './types';
import { ApiScope } from './types';

function toApiScope(pkg: Package): ApiScope {
  switch (pkg.manifest.type) {
    case 'shared-browser':
    case 'shared-scss':
      return ApiScope.CLIENT;
    case 'shared-server':
      return ApiScope.SERVER;
    case 'core':
    case 'test-helper':
    case 'functional-tests':
    case 'shared-common':
      return ApiScope.COMMON;
    case 'plugin':
      return pkg.manifest.plugin.server && !pkg.manifest.plugin.browser
        ? ApiScope.SERVER
        : !pkg.manifest.plugin.server && pkg.manifest.plugin.browser
        ? ApiScope.CLIENT
        : ApiScope.COMMON;
  }
}

function toPluginOrPackage(pkg: Package): PluginOrPackage {
  const result = {
    id: pkg.isPlugin() ? pkg.manifest.plugin.id : pkg.manifest.id,
    directory: Path.resolve(REPO_ROOT, pkg.normalizedRepoRelativeDir),
    manifestPath: Path.resolve(REPO_ROOT, pkg.normalizedRepoRelativeDir, 'kibana.jsonc'),
    isPlugin: pkg.isPlugin(),
    manifest: {
      id: pkg.isPlugin() ? pkg.manifest.plugin.id : pkg.manifest.id,
      pluginId: pkg.isPlugin() ? pkg.manifest.plugin.id : undefined,
      owner: {
        name: pkg.manifest.owner?.[0] ?? '[Owner missing]',
        githubTeam: pkg.manifest.owner?.[0]?.split('@elastic/')[1],
      },
      serviceFolders: pkg.manifest.serviceFolders || [],
      description: pkg.manifest.description || undefined,
    },
    scope: toApiScope(pkg),
  };

  if (pkg.isPlugin()) {
    return {
      ...result,
      manifest: {
        ...result.manifest,
        requiredPlugins: pkg.manifest.plugin.requiredPlugins || [],
        optionalPlugins: pkg.manifest.plugin.optionalPlugins || [],
        requiredBundles: pkg.manifest.plugin.requiredBundles || [],
      },
    };
  }

  return result;
}

/**
 * Options for filtering plugins and packages.
 */
export interface FindPluginsOptions {
  /** Plugin IDs to filter by (plugin.id from kibana.jsonc). */
  pluginFilter?: string[];
  /** Package IDs to filter by (id from kibana.jsonc, e.g., @kbn/package-name). */
  packageFilter?: string[];
}

/**
 * Finds all plugins and packages that should have API documentation generated.
 *
 * @param options - Optional filter options for plugins and packages.
 * @returns Array of plugins and packages to document.
 */
export function findPlugins(options?: FindPluginsOptions): PluginOrPackage[] {
  const { pluginFilter, packageFilter } = options ?? {};
  const packages = getPackages(REPO_ROOT);
  const plugins = packages.filter(
    getPluginPackagesFilter({
      examples: false,
      testPlugins: false,
    })
  );
  const core = packages.find((p) => p.manifest.id === '@kbn/core');

  if (!core) {
    throw new Error('unable to find @kbn/core');
  }

  const hasPluginFilter = pluginFilter && pluginFilter.length > 0;
  const hasPackageFilter = packageFilter && packageFilter.length > 0;

  if (!hasPluginFilter && !hasPackageFilter) {
    return [...[core, ...plugins].map(toPluginOrPackage), ...findPackages()];
  }

  const result: PluginOrPackage[] = [];

  // Filter plugins by plugin.id.
  if (hasPluginFilter) {
    result.push(
      ...plugins.filter((p) => pluginFilter.includes(p.manifest.plugin.id)).map(toPluginOrPackage)
    );
  }

  // Filter packages by manifest.id.
  if (hasPackageFilter) {
    result.push(...findPackages(packageFilter));
  }

  return result;
}

export function findTeamPlugins(team: string): PluginOrPackage[] {
  const packages = getPackages(REPO_ROOT);
  const plugins = packages.filter(
    getPluginPackagesFilter({
      examples: false,
      testPlugins: false,
    })
  );

  return [...plugins.filter((p) => p.manifest.owner.includes(team)).map(toPluginOrPackage)];
}

/**
 * Helper to find packages.
 */
export function findPackages(packageFilter?: string[]): PluginOrPackage[] {
  return getPackages(REPO_ROOT)
    .filter((p) => !p.isPlugin())
    .filter((p) => {
      if (!Array.isArray(packageFilter)) {
        return true;
      } else {
        return packageFilter.includes(p.manifest.id);
      }
    })
    .map(toPluginOrPackage);
}
