/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Module Federation Runtime for Kibana
 * 
 * This module provides utilities for loading plugins via Module Federation
 * at runtime. It replaces the legacy __kbnBundles__ system.
 */

declare global {
  interface Window {
    __kbnMF__: KibanaMFRuntime;
    __kbnThemeTag__: string;
    __kbnPublicPath__: Record<string, string>;
  }
}

export interface PluginDefinition {
  id: string;
  remoteEntry: string;
  requiredPlugins: string[];
}

export interface KibanaMFRuntime {
  registerPlugin: (id: string, remoteEntry: string) => void;
  loadPlugin: <T = unknown>(id: string) => Promise<T>;
  loadPluginExport: <T = unknown>(id: string, exportName: string) => Promise<T>;
  isPluginLoaded: (id: string) => boolean;
  getLoadedPlugins: () => string[];
}

interface RemoteContainer {
  init: (shareScope: Record<string, unknown>) => Promise<void>;
  get: (module: string) => Promise<() => unknown>;
}

/**
 * Create the MF runtime for Kibana
 */
export function createKibanaMFRuntime(): KibanaMFRuntime {
  const loadedContainers = new Map<string, RemoteContainer>();
  const loadingPromises = new Map<string, Promise<RemoteContainer>>();
  const pluginRegistry = new Map<string, string>(); // id -> remoteEntry URL

  // Get or initialize the shared scope
  // @ts-expect-error - webpack runtime globals
  const shareScope = __webpack_share_scopes__?.kibana || {};

  /**
   * Register a plugin's remote entry URL
   */
  function registerPlugin(id: string, remoteEntry: string): void {
    pluginRegistry.set(id, remoteEntry);
  }

  /**
   * Load a remote container
   */
  async function loadContainer(id: string): Promise<RemoteContainer> {
    // Already loaded
    const existing = loadedContainers.get(id);
    if (existing) return existing;

    // Already loading
    const loading = loadingPromises.get(id);
    if (loading) return loading;

    // Start loading
    const remoteEntry = pluginRegistry.get(id);
    if (!remoteEntry) {
      throw new Error(`Plugin "${id}" is not registered. Call registerPlugin first.`);
    }

    const loadPromise = (async () => {
      // Load the remote entry script
      await loadScript(remoteEntry);

      // Get the container from the global scope
      const containerName = `plugin_${id.replace(/-/g, '_')}`;
      const container = (window as any)[containerName] as RemoteContainer;

      if (!container) {
        throw new Error(`Failed to load container for plugin "${id}"`);
      }

      // Initialize the container with shared scope
      await container.init(shareScope);

      loadedContainers.set(id, container);
      return container;
    })();

    loadingPromises.set(id, loadPromise);

    try {
      return await loadPromise;
    } finally {
      loadingPromises.delete(id);
    }
  }

  /**
   * Load a plugin's default export
   */
  async function loadPlugin<T = unknown>(id: string): Promise<T> {
    const container = await loadContainer(id);
    const factory = await container.get('./public');
    const module = factory() as { default?: T; plugin?: T };
    return (module.default ?? module.plugin ?? module) as T;
  }

  /**
   * Load a specific export from a plugin
   */
  async function loadPluginExport<T = unknown>(id: string, exportName: string): Promise<T> {
    const container = await loadContainer(id);
    const modulePath = exportName === 'public' ? './public' : `./${exportName}`;
    const factory = await container.get(modulePath);
    const module = factory() as Record<string, T>;
    return module.default ?? module[exportName] ?? (module as unknown as T);
  }

  /**
   * Check if a plugin is loaded
   */
  function isPluginLoaded(id: string): boolean {
    return loadedContainers.has(id);
  }

  /**
   * Get list of loaded plugins
   */
  function getLoadedPlugins(): string[] {
    return Array.from(loadedContainers.keys());
  }

  return {
    registerPlugin,
    loadPlugin,
    loadPluginExport,
    isPluginLoaded,
    getLoadedPlugins,
  };
}

/**
 * Load a script and wait for it to execute
 */
function loadScript(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    const existing = document.querySelector(`script[src="${url}"]`);
    if (existing) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = url;
    script.async = true;

    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${url}`));

    document.head.appendChild(script);
  });
}

/**
 * Initialize the global MF runtime
 */
export function initializeKibanaMFRuntime(): void {
  if (typeof window !== 'undefined' && !window.__kbnMF__) {
    window.__kbnMF__ = createKibanaMFRuntime();
  }
}

/**
 * Convenience function to load a plugin
 */
export async function loadKibanaPlugin<T = unknown>(id: string): Promise<T> {
  if (!window.__kbnMF__) {
    throw new Error('Kibana MF runtime not initialized');
  }
  return window.__kbnMF__.loadPlugin<T>(id);
}
