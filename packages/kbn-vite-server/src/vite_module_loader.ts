/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createViteServerRuntime } from './vite_server.ts';
import type { ViteServer } from './vite_server.ts';
import { createViteLogger, type ViteServerLog } from './types.ts';

/**
 * Interface for module loaders - matches @kbn/core-plugins-server-internal ModuleLoader
 */
export interface ModuleLoader {
  loadModule<T = unknown>(modulePath: string): Promise<T>;
  invalidateModule?(modulePath: string): void;
  supportsHmr?: boolean;
}

/**
 * Plugin registration for HMR tracking
 */
export interface PluginHmrRegistration {
  /** Unique plugin ID */
  pluginId: string;
  /** Path to the plugin's server directory */
  serverPath: string;
  /** Callback to stop the plugin before reload */
  onStop?: () => Promise<void>;
  /** Callback to start the plugin after reload */
  onStart?: () => Promise<void>;
  /** Check if the plugin can handle HMR */
  canHotReload?: () => boolean;
}

/**
 * HMR update event for plugins
 */
export interface PluginHmrUpdateEvent {
  /** Affected plugin IDs */
  pluginIds: string[];
  /** Changed files */
  files: string[];
  /** Timestamp */
  timestamp: number;
}

/**
 * Callback for plugin HMR updates
 */
export type PluginHmrCallback = (event: PluginHmrUpdateEvent) => Promise<void> | void;

/**
 * Options for creating a ViteModuleLoader
 */
export interface ViteModuleLoaderOptions {
  repoRoot: string;
  onModuleInvalidated?: (modulePath: string) => void;
  onPluginHmrUpdate?: PluginHmrCallback;
  /**
   * An existing ViteServer instance to reuse instead of creating a new one.
   * This avoids the cost of spinning up a second Vite dev server when the
   * bootstrap runtime (from scripts/kibana.mts) is already running.
   */
  existingRuntime?: ViteServer;
  /**
   * Optional structured logger for module loader messages.
   */
  log?: ViteServerLog;
}

/**
 * Module loader that uses Vite's module runner for development.
 * This enables:
 * - Fast TypeScript/ESM execution without pre-compilation
 * - Hot Module Replacement (HMR) for server-side code
 * - Source map support for better debugging
 *
 * This class is pre-compiled as ESM to avoid Babel transformation issues.
 */
export class ViteModuleLoader implements ModuleLoader {
  public readonly supportsHmr = true;

  private viteServer: ViteServer | null = null;
  private onModuleInvalidated?: (modulePath: string) => void;
  private hmrCallbacks: PluginHmrCallback[] = [];
  private unsubscribeHmr?: () => void;
  private readonly options: ViteModuleLoaderOptions;
  private readonly log: ViteServerLog;

  constructor(options: ViteModuleLoaderOptions) {
    this.options = options;
    this.log = options.log ?? createViteLogger('vite-module-loader');
    this.onModuleInvalidated = options.onModuleInvalidated;
    if (options.onPluginHmrUpdate) {
      this.hmrCallbacks.push(options.onPluginHmrUpdate);
    }
  }

  /**
   * Initialize the Vite server runtime
   * This must be called before loading any modules
   */
  async initialize(): Promise<void> {
    if (this.viteServer) {
      return;
    }

    if (this.options.existingRuntime) {
      // Reuse the bootstrap Vite Runtime that was already created by
      // scripts/kibana.mts. This avoids the cost of creating a second
      // Vite dev server (~4-5s startup, ~50-100MB RAM, extra file watcher).
      this.viteServer = this.options.existingRuntime;
      this.log.info('Reusing existing Vite server runtime');
    } else {
      this.viteServer = await createViteServerRuntime({
        repoRoot: this.options.repoRoot,
        hmr: true,
        onModuleInvalidated: this.onModuleInvalidated,
      });
    }

    // Subscribe to HMR updates from the Vite server
    this.unsubscribeHmr = this.viteServer.onHmrUpdate(
      (event: { pluginIds?: string[]; modules?: string[]; timestamp?: number }) => {
        const hmrEvent: PluginHmrUpdateEvent = {
          pluginIds: event.pluginIds || [],
          files: event.modules || [],
          timestamp: event.timestamp || Date.now(),
        };
        this.notifyHmrCallbacks(hmrEvent);
      }
    );
  }

  async loadModule<T = unknown>(modulePath: string): Promise<T> {
    if (!this.viteServer) {
      await this.initialize();
    }

    const result = await this.viteServer!.import(modulePath);
    return result as T;
  }

  invalidateModule(modulePath: string): void {
    if (this.viteServer) {
      this.viteServer.invalidateModule(modulePath);
    }
  }

  /**
   * Register a plugin for HMR tracking
   */
  registerPluginForHmr(registration: PluginHmrRegistration): void {
    if (this.viteServer) {
      this.viteServer.registerPluginForHmr({
        pluginId: registration.pluginId,
        serverPath: registration.serverPath,
        lifecycle: {
          stop: registration.onStop,
          start: registration.onStart,
          canHotReload: registration.canHotReload,
        },
      });
    }
  }

  /**
   * Unregister a plugin from HMR tracking
   */
  unregisterPluginFromHmr(pluginId: string): void {
    if (this.viteServer) {
      this.viteServer.unregisterPluginFromHmr(pluginId);
    }
  }

  /**
   * Add a callback for plugin HMR updates
   * Returns a function to remove the callback
   */
  onPluginHmrUpdate(callback: PluginHmrCallback): () => void {
    this.hmrCallbacks.push(callback);
    return () => {
      const index = this.hmrCallbacks.indexOf(callback);
      if (index !== -1) {
        this.hmrCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Manually trigger a reload for specific plugins
   */
  async reloadPlugins(pluginIds: string[]): Promise<void> {
    if (this.viteServer) {
      await this.viteServer.reloadPlugins(pluginIds);
    }
  }

  /**
   * Get the underlying Vite server instance
   */
  getViteServer(): ViteServer | null {
    return this.viteServer;
  }

  async close(): Promise<void> {
    if (this.unsubscribeHmr) {
      this.unsubscribeHmr();
      this.unsubscribeHmr = undefined;
    }

    if (this.viteServer) {
      await this.viteServer.stop();
      this.viteServer = null;
    }

    this.hmrCallbacks.length = 0;
  }

  private async notifyHmrCallbacks(event: PluginHmrUpdateEvent): Promise<void> {
    for (const callback of this.hmrCallbacks) {
      try {
        await callback(event);
      } catch (error) {
        this.log.error(`Error in HMR callback: ${error}`);
      }
    }
  }
}

/**
 * Create a Vite module loader for development use.
 * This is pre-compiled as ESM to work with Vite's ESM-only dependencies.
 *
 * @param options - Configuration options
 * @returns A ViteModuleLoader instance
 */
export function createViteModuleLoader(options: ViteModuleLoaderOptions): ViteModuleLoader {
  return new ViteModuleLoader(options);
}
