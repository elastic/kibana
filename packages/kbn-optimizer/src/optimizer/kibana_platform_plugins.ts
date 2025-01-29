/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import { type PluginPackage, getPluginPackagesFilter } from '@kbn/repo-packages';

const isDefaultPlugin = getPluginPackagesFilter();

export interface KibanaPlatformPlugin {
  readonly directory: string;
  readonly manifestPath: string;
  readonly id: string;
  readonly pkgId: string;
  readonly isUiPlugin: boolean;
  readonly extraPublicDirs: string[];
  readonly ignoreMetrics: boolean;
}

/**
 * Helper to find the new platform plugins.
 */
export function toKibanaPlatformPlugin(repoRoot: string, pkg: PluginPackage): KibanaPlatformPlugin {
  const directory = Path.resolve(repoRoot, pkg.normalizedRepoRelativeDir);
  return {
    directory,
    manifestPath: Path.resolve(directory, 'kibana.jsonc'),
    id: pkg.manifest.plugin.id,
    pkgId: pkg.manifest.id,
    isUiPlugin: pkg.isPlugin() && pkg.manifest.plugin.browser,
    extraPublicDirs: (pkg.isPlugin() && pkg.manifest.plugin.extraPublicDirs) || [],
    ignoreMetrics: !isDefaultPlugin(pkg),
  };
}
