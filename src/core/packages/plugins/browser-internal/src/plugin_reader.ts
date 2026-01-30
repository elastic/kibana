/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ContainerModule } from 'inversify';
import type { PluginInitializer } from '@kbn/core-plugins-browser';

/**
 * Unknown variant for internal use only for when plugins are not known.
 * @internal
 */
export type UnknownPluginInitializer = PluginInitializer<unknown, unknown>;

/**
 * @internal
 */
export interface PluginDefinition {
  module?: ContainerModule;
  plugin?: UnknownPluginInitializer;
}

/**
 * Custom window type for loading bundles. Do not extend global Window to avoid leaking these types.
 * @internal
 */
export interface CoreWindow {
  __kbnBundles__: {
    has(key: string): boolean;
    get(key: string): PluginDefinition | undefined;
  };
}

/**
 * MF Runtime interface
 * @internal
 */
export interface KbnMFRuntime {
  registerPlugin(id: string, remoteEntry: string): void;
  loadPlugin<T = unknown>(id: string): Promise<T>;
  loadPluginExport<T = unknown>(id: string, exportName: string): Promise<T>;
  isPluginLoaded(id: string): boolean;
  getLoadedPlugins(): string[];
}

/**
 * Custom window type for MF loading.
 * @internal
 */
export interface MFCoreWindow {
  __kbnMF__: KbnMFRuntime;
}

/**
 * Check if Module Federation runtime is available
 */
export function isMFMode(): boolean {
  return typeof (window as unknown as MFCoreWindow).__kbnMF__ !== 'undefined';
}

/**
 * Reads the plugin's bundle declared in the global context.
 * Legacy mode using __kbnBundles__
 */
export function read(name: string): PluginDefinition {
  const coreWindow = window as unknown as CoreWindow;
  const exportId = `plugin/${name}/public`;

  if (!coreWindow.__kbnBundles__.has(exportId)) {
    throw new Error(`Definition of plugin "${name}" not found and may have failed to load.`);
  }

  const pluginExport = coreWindow.__kbnBundles__.get(exportId);
  if (!pluginExport?.module && typeof pluginExport?.plugin !== 'function') {
    throw new Error(`Definition of plugin "${name}" should either be a function or a module.`);
  }

  return pluginExport;
}

/**
 * Reads the plugin's bundle using Module Federation.
 * Returns a promise since MF loads modules asynchronously.
 */
export async function readMF(name: string): Promise<PluginDefinition> {
  const mfWindow = window as unknown as MFCoreWindow;

  if (!mfWindow.__kbnMF__) {
    throw new Error('Module Federation runtime not available. Is Kibana running in MF mode?');
  }

  try {
    const module = await mfWindow.__kbnMF__.loadPlugin(name);

    // The module should export either a plugin function or a ContainerModule
    if (typeof module === 'function') {
      return { plugin: module as UnknownPluginInitializer };
    }

    if (module && typeof module === 'object') {
      const moduleObj = module as Record<string, unknown>;

      // Check for plugin export
      if (typeof moduleObj.plugin === 'function') {
        return { plugin: moduleObj.plugin as UnknownPluginInitializer };
      }

      // Check for default export
      if (typeof moduleObj.default === 'function') {
        return { plugin: moduleObj.default as UnknownPluginInitializer };
      }

      // Check for ContainerModule
      if (moduleObj.module) {
        return { module: moduleObj.module as ContainerModule };
      }
    }

    throw new Error(
      `Plugin "${name}" does not export a valid plugin. Expected a function or module with plugin/default export.`
    );
  } catch (error) {
    throw new Error(
      `Failed to load plugin "${name}" via Module Federation: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Universal plugin reader - uses MF if available, falls back to __kbnBundles__
 */
export async function readPlugin(name: string): Promise<PluginDefinition> {
  if (isMFMode()) {
    return readMF(name);
  }
  return read(name);
}
