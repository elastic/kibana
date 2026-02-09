/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createServer as createViteServer, type ViteDevServer, type InlineConfig } from 'vite';

import { createViteLogger, type ViteServerOptions, type ViteModuleRunner, type KbnViteDevServer } from './types.ts';
import { createModuleRunner, resolveModulePath } from './module_runner.ts';
import { createServerRuntimeConfig } from './server_config.ts';
import type { HmrHandler } from './hmr_handler.ts';
import {
  createHmrHandler,
  type HmrPluginInfo,
  type HmrUpdateCallback,
  type HmrUpdateEvent,
} from './hmr_handler.ts';

/**
 * ViteServer provides a runtime environment for executing Kibana server code
 * using Vite's transformation pipeline.
 *
 * This enables:
 * - Fast TypeScript/ESM execution without pre-compilation
 * - Hot Module Replacement for server-side code
 * - Source map support for better debugging
 * - Consistent module resolution with the browser dev server
 */
export class ViteServer {
  private viteServer: ViteDevServer | null = null;
  private moduleRunner: ViteModuleRunner | null = null;
  private hmrHandler: HmrHandler | null = null;
  private options: ViteServerOptions;
  private isClosing = false;

  private log;

  constructor(options: ViteServerOptions) {
    this.options = options;
    this.log = options.log ?? createViteLogger('vite-server');
  }

  /**
   * Start the Vite server and module runner
   */
  async start(): Promise<void> {
    if (this.viteServer) {
      throw new Error('ViteServer is already started');
    }

    // Create the Vite configuration for server runtime
    const config = createServerRuntimeConfig(this.options);

    // Merge with any additional config overrides
    const finalConfig: InlineConfig = {
      ...config,
      ...this.options.viteConfig,
    };

    // Create the Vite dev server
    this.viteServer = await createViteServer(finalConfig);

    // Create the module runner
    this.moduleRunner = await createModuleRunner(this.viteServer, this.options);

    // Create the HMR handler if HMR is enabled
    if (this.options.hmr !== false && this.moduleRunner) {
      this.hmrHandler = createHmrHandler(this.viteServer, this.moduleRunner, {
        repoRoot: this.options.repoRoot,
        verbose: process.env.DEBUG === 'true' || process.env.KBN_VITE_DEBUG === 'true',
        onUpdate: this.options.onHmrUpdate
          ? (event: HmrUpdateEvent) => this.options.onHmrUpdate?.(event.modules)
          : undefined,
      });
    }

    // Only log the first time in this process — multiple ViteServer instances
    // may be created (parent, optimizer, child) and this message is redundant.
    if (!(globalThis as any).__kbnViteServerLogged) {
      (globalThis as any).__kbnViteServerLogged = true;
      this.log.info('Started Vite server runtime');
    }
  }

  /**
   * Execute a module and return its exports
   */
  async executeModule<T = unknown>(modulePath: string): Promise<T> {
    if (!this.moduleRunner) {
      throw new Error('ViteServer is not started. Call start() first.');
    }

    const resolvedPath = resolveModulePath(this.options.repoRoot, modulePath);
    const result = await this.moduleRunner.executeModule<T>(resolvedPath);
    return result.exports;
  }

  /**
   * Import a module dynamically (alias for executeModule)
   * This provides a familiar API similar to dynamic import()
   */
  async import<T = unknown>(modulePath: string): Promise<T> {
    return this.executeModule<T>(modulePath);
  }

  /**
   * Invalidate a module in the cache, triggering re-execution on next access
   */
  invalidateModule(modulePath: string): void {
    if (!this.moduleRunner) {
      return;
    }

    const resolvedPath = resolveModulePath(this.options.repoRoot, modulePath);
    this.moduleRunner.invalidateModule(resolvedPath);
  }

  /**
   * Clear all cached modules
   */
  clearCache(): void {
    if (this.moduleRunner) {
      this.moduleRunner.clearCache();
    }
  }

  /**
   * Get the underlying Vite dev server
   */
  getViteServer(): KbnViteDevServer | null {
    if (!this.viteServer || !this.moduleRunner) {
      return null;
    }

    return Object.assign(this.viteServer, {
      moduleRunner: this.moduleRunner,
    }) as KbnViteDevServer;
  }

  /**
   * Get the module runner
   */
  getModuleRunner(): ViteModuleRunner | null {
    return this.moduleRunner;
  }

  /**
   * Check if the server is running
   */
  isRunning(): boolean {
    return this.viteServer !== null && !this.isClosing;
  }

  /**
   * Register a plugin for HMR tracking
   */
  registerPluginForHmr(info: HmrPluginInfo): void {
    if (this.hmrHandler) {
      this.hmrHandler.registerPlugin(info);
    }
  }

  /**
   * Unregister a plugin from HMR tracking
   */
  unregisterPluginFromHmr(pluginId: string): void {
    if (this.hmrHandler) {
      this.hmrHandler.unregisterPlugin(pluginId);
    }
  }

  /**
   * Add a callback for HMR updates
   * Returns a function to remove the callback
   */
  onHmrUpdate(callback: HmrUpdateCallback): () => void {
    if (this.hmrHandler) {
      return this.hmrHandler.onUpdate(callback);
    }
    return () => {};
  }

  /**
   * Manually trigger a reload for specific plugins
   */
  async reloadPlugins(pluginIds: string[]): Promise<void> {
    if (this.hmrHandler) {
      await this.hmrHandler.reloadPlugins(pluginIds);
    }
  }

  /**
   * Get the HMR handler
   */
  getHmrHandler(): HmrHandler | null {
    return this.hmrHandler;
  }

  /**
   * Stop the Vite server and clean up resources
   */
  async stop(): Promise<void> {
    if (this.isClosing) {
      return;
    }

    this.isClosing = true;

    try {
      if (this.hmrHandler) {
        this.hmrHandler.dispose();
        this.hmrHandler = null;
      }

      if (this.moduleRunner) {
        await this.moduleRunner.close();
        this.moduleRunner = null;
      }

      if (this.viteServer) {
        await this.viteServer.close();
        this.viteServer = null;
      }

      this.log.info('Stopped Vite server runtime');
    } finally {
      this.isClosing = false;
    }
  }
}

/**
 * Create and start a ViteServer instance
 */
export async function createViteServerRuntime(options: ViteServerOptions): Promise<ViteServer> {
  const server = new ViteServer(options);
  await server.start();
  return server;
}
