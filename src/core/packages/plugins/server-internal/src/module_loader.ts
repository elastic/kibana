/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { join } from 'path';

/**
 * Interface for loading plugin modules.
 * This abstraction allows different module loading strategies:
 * - Synchronous require() for production
 * - Async import() for ESM compatibility
 * - Vite module runner for development with HMR
 *
 * @public
 */
export interface ModuleLoader {
  /**
   * Load a module by path
   * @param modulePath - The path to the module to load
   * @returns The loaded module exports
   */
  loadModule<T = unknown>(modulePath: string): Promise<T>;

  /**
   * Invalidate a cached module (for HMR support)
   * @param modulePath - The path to the module to invalidate
   */
  invalidateModule?(modulePath: string): void;

  /**
   * Check if this loader supports HMR
   */
  supportsHmr?: boolean;

  /**
   * Clean up resources when the loader is no longer needed
   */
  close?(): Promise<void>;
}

/**
 * Default module loader using Node.js require()
 * This is the standard loader used in production.
 *
 * @internal
 */
export class RequireModuleLoader implements ModuleLoader {
  public readonly supportsHmr = false;

  async loadModule<T = unknown>(modulePath: string): Promise<T> {
    // Use require() for synchronous loading
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require(modulePath) ?? ({} as T);
  }

  invalidateModule(modulePath: string): void {
    // Clear from Node's require cache
    const resolvedPath = require.resolve(modulePath);
    delete require.cache[resolvedPath];
  }
}

/**
 * Module loader using dynamic import() for ESM modules
 * This loader supports both CommonJS and ES modules.
 *
 * @internal
 */
export class DynamicImportModuleLoader implements ModuleLoader {
  public readonly supportsHmr = false;

  private moduleCache = new Map<string, unknown>();

  async loadModule<T = unknown>(modulePath: string): Promise<T> {
    // Check cache first
    if (this.moduleCache.has(modulePath)) {
      return this.moduleCache.get(modulePath) as T;
    }

    // Use dynamic import for ESM compatibility
    const module = await import(/* @vite-ignore */ modulePath);

    // Handle both default and named exports
    const exports = module.default ?? module;
    this.moduleCache.set(modulePath, exports);

    return exports as T;
  }

  invalidateModule(modulePath: string): void {
    this.moduleCache.delete(modulePath);
  }
}

/**
 * Helper to resolve the server module path for a plugin
 */
export function resolvePluginServerPath(pluginPath: string): string {
  return join(pluginPath, 'server');
}

/**
 * Create the default module loader based on environment.
 * Uses DynamicImportModuleLoader which works with both Node.js native ESM
 * and Vite's Module Runner (which intercepts import() calls).
 */
export function createDefaultModuleLoader(): ModuleLoader {
  return new DynamicImportModuleLoader();
}

/**
 * Global module loader instance
 * This can be replaced at runtime to switch loading strategies
 */
let globalModuleLoader: ModuleLoader | null = null;

/**
 * Set the global module loader
 * This should be called early in the startup process to configure
 * the loading strategy (e.g., Vite for development)
 */
export function setGlobalModuleLoader(loader: ModuleLoader): void {
  globalModuleLoader = loader;
}

/**
 * Get the global module loader, creating a default one if not set
 */
export function getGlobalModuleLoader(): ModuleLoader {
  if (!globalModuleLoader) {
    globalModuleLoader = createDefaultModuleLoader();
  }
  return globalModuleLoader;
}
