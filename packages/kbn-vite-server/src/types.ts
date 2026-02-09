/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ViteDevServer } from 'vite';
// picocolors ships with Vite and is always available at runtime
import pc from 'picocolors';

/**
 * Simple structured logger for Vite server messages.
 * Callers can provide their own implementation to integrate with
 * ToolingLog, Kibana core Logger, or any other logging framework.
 */
export interface ViteServerLog {
  info(msg: string): void;
  warn(msg: string): void;
  error(msg: string): void;
}

/**
 * Create a default ViteServerLog that formats messages with a timestamp
 * and context name, matching the kbn tooling log style with colors.
 *
 * Output format:  ` np bld    log   [HH:mm:ss.SSS] [level][@kbn/name] message`
 */
export function createViteLogger(name: string): ViteServerLog {
  const time = () => {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    const ms = String(d.getMilliseconds()).padStart(3, '0');
    return `${hh}:${mm}:${ss}.${ms}`;
  };

  const prefix = ` np bld    log   `;
  const coloredName = pc.magentaBright(`@kbn/${name}`);
  return {
    info: (msg) =>
      // eslint-disable-next-line no-console
      console.log(`${prefix}[${time()}] [${pc.green('info')}][${coloredName}] ${msg}`),
    warn: (msg) =>
      // eslint-disable-next-line no-console
      console.log(`${prefix}[${time()}] [${pc.yellow('warning')}][${coloredName}] ${msg}`),
    error: (msg) =>
      // eslint-disable-next-line no-console
      console.error(`${prefix}[${time()}] [${pc.red('error')}][${coloredName}] ${msg}`),
  };
}

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

  /**
   * Optional structured logger. When not provided, a default logger
   * is created that writes formatted messages to stdout.
   */
  log?: ViteServerLog;
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
