/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PluginInfo } from './get_plugin_bundle_paths';

/**
 * Module Federation mode: Get dependency paths
 * 
 * Unlike the legacy mode that loads DLL + shared deps + all bundles upfront,
 * MF mode only needs to load the core remote entry. Plugins are loaded
 * dynamically via MF.
 */
export interface MFDependencyPaths {
  /** Core remote entry URL */
  coreRemoteEntry: string;
  /** Plugin remote entries for registration (not loaded upfront) */
  plugins: Array<{
    id: string;
    remoteEntry: string;
  }>;
}

export const getMFDependencyPaths = (
  bundlesHref: string,
  bundlePaths: Map<string, PluginInfo>
): MFDependencyPaths => {
  return {
    // Core remote entry - loaded first
    coreRemoteEntry: `${bundlesHref}/core/remoteEntry.js`,

    // Plugin remote entries - registered but not loaded until needed
    plugins: [...bundlePaths.entries()].map(([pluginId, plugin]) => ({
      id: pluginId,
      remoteEntry: `${plugin.publicPath}remoteEntry.js`,
    })),
  };
};
