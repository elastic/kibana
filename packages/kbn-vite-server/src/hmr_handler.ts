/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import type { ViteDevServer, HmrContext as ViteHmrContext, ModuleNode } from 'vite';
import type { ViteModuleRunner, HmrPluginLifecycle } from './types.ts';

/**
 * Plugin registration info for HMR tracking
 */
export interface HmrPluginInfo {
  /** Unique plugin ID */
  pluginId: string;
  /** Path to the plugin's server directory */
  serverPath: string;
  /** Plugin lifecycle hooks */
  lifecycle?: HmrPluginLifecycle;
  /** Current plugin instance */
  instance?: unknown;
}

/**
 * HMR update event
 */
export interface HmrUpdateEvent {
  /** The file that changed */
  file: string;
  /** Affected module IDs */
  modules: string[];
  /** Affected plugin IDs */
  pluginIds: string[];
  /** Timestamp of the update */
  timestamp: number;
}

/**
 * Callback for HMR events
 */
export type HmrUpdateCallback = (event: HmrUpdateEvent) => Promise<void> | void;

/**
 * Options for the HMR handler
 */
export interface HmrHandlerOptions {
  /** Root directory of the repository */
  repoRoot: string;
  /** Callback when an update is ready to be applied */
  onUpdate?: HmrUpdateCallback;
  /** Callback when an update fails */
  onError?: (error: Error, event: HmrUpdateEvent) => void;
  /** Callback before plugin reload */
  onBeforeReload?: (pluginIds: string[]) => Promise<void>;
  /** Callback after plugin reload */
  onAfterReload?: (pluginIds: string[]) => Promise<void>;
  /** Whether to log HMR events */
  verbose?: boolean;
}

/**
 * Server-side HMR Handler for Kibana plugins
 *
 * This class manages Hot Module Replacement for server-side plugin code:
 * - Tracks registered plugins and their file paths
 * - Listens to Vite's HMR events
 * - Coordinates plugin reloading without full process restart
 * - Provides hooks for plugin lifecycle management
 */
export class HmrHandler {
  private plugins = new Map<string, HmrPluginInfo>();
  // Sorted array of [normalizedServerPath, pluginId] for fast O(log n) prefix lookup
  private sortedPluginPaths: Array<[string, string]> = [];
  // Cache for file-to-plugin lookups — avoids repeated path normalization + search
  private filePluginCache = new Map<string, HmrPluginInfo | undefined>();
  private updateCallbacks: HmrUpdateCallback[] = [];
  private isProcessingUpdate = false;
  private updateQueue: HmrUpdateEvent[] = [];
  private readonly viteServer: ViteDevServer;
  private readonly moduleRunner: ViteModuleRunner;
  private readonly options: HmrHandlerOptions;

  constructor(
    viteServer: ViteDevServer,
    moduleRunner: ViteModuleRunner,
    options: HmrHandlerOptions
  ) {
    this.viteServer = viteServer;
    this.moduleRunner = moduleRunner;
    this.options = options;
    this.setupHmrListeners();
  }

  /**
   * Rebuild the sorted path index after plugin registration changes.
   * Sorted by path descending so longest (most specific) prefix matches first.
   */
  private rebuildPathIndex(): void {
    this.sortedPluginPaths = Array.from(this.plugins.values()).map(
      (p) => [Path.normalize(p.serverPath), p.pluginId] as [string, string]
    );
    // Sort descending by path length so the longest prefix matches first
    this.sortedPluginPaths.sort((a, b) => b[0].length - a[0].length);
    // Clear the lookup cache when the index changes
    this.filePluginCache.clear();
  }

  /**
   * Register a plugin for HMR tracking
   */
  registerPlugin(info: HmrPluginInfo): void {
    this.plugins.set(info.pluginId, info);
    this.rebuildPathIndex();
    this.log(`Registered plugin for HMR: ${info.pluginId}`);
  }

  /**
   * Unregister a plugin from HMR tracking
   */
  unregisterPlugin(pluginId: string): void {
    this.plugins.delete(pluginId);
    this.rebuildPathIndex();
    this.log(`Unregistered plugin from HMR: ${pluginId}`);
  }

  /**
   * Update plugin lifecycle hooks
   */
  updatePluginLifecycle(pluginId: string, lifecycle: HmrPluginLifecycle): void {
    const plugin = this.plugins.get(pluginId);
    if (plugin) {
      plugin.lifecycle = lifecycle;
    }
  }

  /**
   * Update plugin instance reference
   */
  updatePluginInstance(pluginId: string, instance: unknown): void {
    const plugin = this.plugins.get(pluginId);
    if (plugin) {
      plugin.instance = instance;
    }
  }

  /**
   * Add a callback for HMR updates
   */
  onUpdate(callback: HmrUpdateCallback): () => void {
    this.updateCallbacks.push(callback);
    return () => {
      const index = this.updateCallbacks.indexOf(callback);
      if (index !== -1) {
        this.updateCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Get all registered plugins
   */
  getRegisteredPlugins(): HmrPluginInfo[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Check if a file path belongs to a registered plugin.
   * Uses a cached sorted-path index for fast prefix matching.
   */
  getPluginForFile(filePath: string): HmrPluginInfo | undefined {
    // Check the file→plugin cache first
    if (this.filePluginCache.has(filePath)) {
      return this.filePluginCache.get(filePath);
    }

    const normalizedPath = Path.normalize(filePath);

    // Walk the sorted path index (longest-first) for a prefix match
    for (const [pluginPath, pluginId] of this.sortedPluginPaths) {
      if (normalizedPath.startsWith(pluginPath)) {
        const plugin = this.plugins.get(pluginId);
        this.filePluginCache.set(filePath, plugin);
        return plugin;
      }
    }

    this.filePluginCache.set(filePath, undefined);
    return undefined;
  }

  /**
   * Get affected plugins for a set of module IDs
   */
  getAffectedPlugins(moduleIds: string[]): string[] {
    const affectedPlugins = new Set<string>();

    for (const moduleId of moduleIds) {
      const plugin = this.getPluginForFile(moduleId);
      if (plugin) {
        affectedPlugins.add(plugin.pluginId);
      }
    }

    return Array.from(affectedPlugins);
  }

  /**
   * Manually trigger a reload for specific plugins
   */
  async reloadPlugins(pluginIds: string[]): Promise<void> {
    const event: HmrUpdateEvent = {
      file: 'manual-reload',
      modules: [],
      pluginIds,
      timestamp: Date.now(),
    };

    await this.processUpdate(event);
  }

  /**
   * Invalidate all modules for a plugin
   */
  invalidatePlugin(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      return;
    }

    // Get all cached modules that belong to this plugin
    const cachedModules = this.moduleRunner.getCachedModuleIds();
    const pluginModules = cachedModules.filter((moduleId) => {
      const normalizedPath = Path.normalize(moduleId);
      const pluginServerPath = Path.normalize(plugin.serverPath);
      return normalizedPath.startsWith(pluginServerPath);
    });

    // Invalidate each module
    for (const moduleId of pluginModules) {
      this.moduleRunner.invalidateModule(moduleId);
    }

    this.log(`Invalidated ${pluginModules.length} modules for plugin: ${pluginId}`);
  }

  /**
   * Set up Vite HMR event listeners
   */
  private setupHmrListeners(): void {
    // Listen to Vite's hot update events
    this.viteServer.watcher.on('change', (file) => {
      this.handleFileChange(file);
    });

    // Handle HMR updates from Vite
    if (this.viteServer.hot) {
      this.viteServer.hot.on('vite:beforeFullReload', () => {
        this.log('Full reload requested - consider if plugin reload is sufficient');
      });
    }

    // Custom plugin for handling server HMR
    const originalHandleHotUpdate = this.viteServer.config.plugins.find(
      (p) => p.name === 'kbn-server'
    )?.handleHotUpdate;

    // We'll intercept HMR updates through the watcher
    this.log('HMR listeners initialized');
  }

  /**
   * Handle a file change event
   */
  private async handleFileChange(file: string): Promise<void> {
    const absolutePath = Path.isAbsolute(file) ? file : Path.resolve(this.options.repoRoot, file);
    const relativePath = Path.relative(this.options.repoRoot, absolutePath);

    // Check if this file belongs to a registered plugin
    const plugin = this.getPluginForFile(absolutePath);
    if (!plugin) {
      // Not a plugin file, ignore
      return;
    }

    // Check if the plugin can handle hot reload
    if (plugin.lifecycle?.canHotReload && !plugin.lifecycle.canHotReload()) {
      this.log(`Plugin ${plugin.pluginId} cannot hot reload, full restart may be needed`);
      return;
    }

    this.log(`File changed: ${relativePath} (plugin: ${plugin.pluginId})`);

    // Create the update event
    const event: HmrUpdateEvent = {
      file: absolutePath,
      modules: [absolutePath],
      pluginIds: [plugin.pluginId],
      timestamp: Date.now(),
    };

    // Queue the update
    this.queueUpdate(event);
  }

  /**
   * Queue an update for processing
   */
  private queueUpdate(event: HmrUpdateEvent): void {
    // Merge with existing pending update for the same plugin
    const existingIndex = this.updateQueue.findIndex((e) =>
      e.pluginIds.some((id) => event.pluginIds.includes(id))
    );

    if (existingIndex !== -1) {
      // Merge the updates
      const existing = this.updateQueue[existingIndex];
      existing.modules = [...new Set([...existing.modules, ...event.modules])];
      existing.pluginIds = [...new Set([...existing.pluginIds, ...event.pluginIds])];
      existing.timestamp = event.timestamp;
    } else {
      this.updateQueue.push(event);
    }

    // Process the queue with debouncing
    this.scheduleProcessQueue();
  }

  private processQueueTimeout: NodeJS.Timeout | null = null;

  /**
   * Schedule queue processing with debounce
   */
  private scheduleProcessQueue(): void {
    if (this.processQueueTimeout) {
      clearTimeout(this.processQueueTimeout);
    }

    // Debounce updates to batch rapid file changes
    this.processQueueTimeout = setTimeout(() => {
      this.processQueueTimeout = null;
      this.processQueue();
    }, 100);
  }

  /**
   * Process the update queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingUpdate || this.updateQueue.length === 0) {
      return;
    }

    this.isProcessingUpdate = true;

    try {
      // Take all pending updates
      const updates = [...this.updateQueue];
      this.updateQueue = [];

      // Merge all updates into one
      const mergedEvent: HmrUpdateEvent = {
        file: updates.map((u) => u.file).join(', '),
        modules: [...new Set(updates.flatMap((u) => u.modules))],
        pluginIds: [...new Set(updates.flatMap((u) => u.pluginIds))],
        timestamp: Date.now(),
      };

      await this.processUpdate(mergedEvent);
    } finally {
      this.isProcessingUpdate = false;

      // Process any updates that came in while we were processing
      if (this.updateQueue.length > 0) {
        this.scheduleProcessQueue();
      }
    }
  }

  /**
   * Process a single HMR update
   */
  private async processUpdate(event: HmrUpdateEvent): Promise<void> {
    this.log(`Processing HMR update for plugins: ${event.pluginIds.join(', ')}`);

    try {
      // Call before reload hook
      if (this.options.onBeforeReload) {
        await this.options.onBeforeReload(event.pluginIds);
      }

      // Stop affected plugins
      await this.stopPlugins(event.pluginIds);

      // Invalidate modules
      for (const moduleId of event.modules) {
        this.moduleRunner.invalidateModule(moduleId);
      }

      // Notify callbacks
      if (this.options.onUpdate) {
        await this.options.onUpdate(event);
      }

      for (const callback of this.updateCallbacks) {
        await callback(event);
      }

      // Call after reload hook
      if (this.options.onAfterReload) {
        await this.options.onAfterReload(event.pluginIds);
      }

      this.log(`HMR update completed for plugins: ${event.pluginIds.join(', ')}`);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.log(`HMR update failed: ${err.message}`);

      if (this.options.onError) {
        this.options.onError(err, event);
      }
    }
  }

  /**
   * Stop plugins before reload
   */
  private async stopPlugins(pluginIds: string[]): Promise<void> {
    for (const pluginId of pluginIds) {
      const plugin = this.plugins.get(pluginId);
      if (plugin?.lifecycle?.stop) {
        try {
          this.log(`Stopping plugin: ${pluginId}`);
          await plugin.lifecycle.stop();
        } catch (error) {
          this.log(`Error stopping plugin ${pluginId}: ${error}`);
        }
      }
    }
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.processQueueTimeout) {
      clearTimeout(this.processQueueTimeout);
      this.processQueueTimeout = null;
    }

    this.plugins.clear();
    this.sortedPluginPaths.length = 0;
    this.filePluginCache.clear();
    this.updateCallbacks.length = 0;
    this.updateQueue.length = 0;
  }

  /**
   * Log a message if verbose mode is enabled
   */
  private log(message: string): void {
    if (this.options.verbose) {
      console.log(`[hmr-handler] ${message}`);
    }
  }
}

/**
 * Create an HMR handler for a Vite server
 */
export function createHmrHandler(
  viteServer: ViteDevServer,
  moduleRunner: ViteModuleRunner,
  options: HmrHandlerOptions
): HmrHandler {
  return new HmrHandler(viteServer, moduleRunner, options);
}
