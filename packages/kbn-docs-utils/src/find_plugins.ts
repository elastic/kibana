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
import { ApiScope, PluginOrPackage } from './types';

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

export function findPlugins(pluginOrPackageFilter?: string[]): PluginOrPackage[] {
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

  if (!pluginOrPackageFilter) {
    return [...[core, ...plugins].map(toPluginOrPackage), ...findPackages()];
  } else {
    return [
      ...plugins
        .filter((p) => pluginOrPackageFilter.includes(p.manifest.plugin.id))
        .map(toPluginOrPackage),
      ...findPackages(pluginOrPackageFilter),
    ];
  }
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
