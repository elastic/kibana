/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginInitializer } from './plugin';

/**
 * Unknown variant for internal use only for when plugins are not known.
 * @internal
 */
export type UnknownPluginInitializer = PluginInitializer<unknown, Record<string, unknown>>;

/**
 * Custom window type for loading bundles. Do not extend global Window to avoid leaking these types.
 * @internal
 */
export interface CoreWindow {
  __kbnBundles__: {
    has(key: string): boolean;
    get(key: string): { plugin: UnknownPluginInitializer } | undefined;
  };
}

/**
 * Reads the plugin's bundle declared in the global context.
 */
export function read(name: string) {
  const coreWindow = window as unknown as CoreWindow;
  const exportId = `plugin/${name}/public`;

  if (!coreWindow.__kbnBundles__.has(exportId)) {
    throw new Error(`Definition of plugin "${name}" not found and may have failed to load.`);
  }

  const pluginExport = coreWindow.__kbnBundles__.get(exportId);
  if (typeof pluginExport?.plugin !== 'function') {
    throw new Error(`Definition of plugin "${name}" should be a function.`);
  } else {
    return pluginExport.plugin;
  }
}
