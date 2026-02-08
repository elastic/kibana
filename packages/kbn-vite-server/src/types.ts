/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ViteDevServer } from 'vite';

/**
 * Configuration options for the Vite Server Runtime
 */
export interface ViteServerOptions {
  /**
   * The root directory of the Kibana repository
   */
  repoRoot: string;

  /**
   * Whether to enable Hot Module Replacement
   */
  hmr?: boolean;

  /**
   * Callback when a module is invalidated (for HMR)
   */
  onModuleInvalidated?: (moduleId: string) => void;

  /**
   * Callback when HMR update is ready
   */
  onHmrUpdate?: (modules: string[]) => void;

  /**
   * Additional Vite configuration overrides
   */
  viteConfig?: Record<string, unknown>;
}

/**
 * Result of executing a module
 */
export interface ModuleExecuteResult<T = unknown> {
  /**
   * The exported module
   */
  exports: T;

  /**
   * Dependencies of the module
   */
  dependencies: string[];
}

/**
 * HMR context for a module
 */
export interface HmrContext {
  /**
   * Accept updates for this module
   */
  accept: (callback?: (newModule: unknown) => void) => void;

  /**
   * Dispose callback for cleanup
   */
  dispose: (callback: () => void) => void;

  /**
   * Invalidate this module and trigger a full reload
   */
  invalidate: () => void;

  /**
   * Data that persists across HMR updates
   */
  data: Record<string, unknown>;
}

/**
 * Interface for the Vite Module Runner
 */
export interface ViteModuleRunner {
  /**
   * Execute a module and return its exports
   */
  executeModule<T = unknown>(moduleId: string): Promise<ModuleExecuteResult<T>>;

  /**
   * Invalidate a module in the cache
   */
  invalidateModule(moduleId: string): void;

  /**
   * Get all cached module IDs
   */
  getCachedModuleIds(): string[];

  /**
   * Clear the module cache
   */
  clearCache(): void;

  /**
   * Close the runner and clean up resources
   */
  close(): Promise<void>;
}

/**
 * Plugin lifecycle hooks that support HMR
 */
export interface HmrPluginLifecycle {
  /**
   * Called when the plugin should stop (before HMR update)
   */
  stop?: () => Promise<void>;

  /**
   * Called when the plugin should start (after HMR update)
   */
  start?: () => Promise<void>;

  /**
   * Called to check if this plugin can handle HMR
   */
  canHotReload?: () => boolean;
}

/**
 * Vite dev server with additional Kibana-specific methods
 */
export interface KbnViteDevServer extends ViteDevServer {
  /**
   * Module runner for executing server-side code
   */
  moduleRunner: ViteModuleRunner;
}
