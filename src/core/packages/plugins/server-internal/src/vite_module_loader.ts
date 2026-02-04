/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * This file re-exports types from @kbn/vite-server for backward compatibility.
 * The actual ViteModuleLoader implementation is in @kbn/vite-server,
 * which is pre-compiled as ESM to work with Vite's ESM-only dependencies.
 *
 * To use ViteModuleLoader, dynamically import it from @kbn/vite-server:
 *
 * ```typescript
 * const { createViteModuleLoader } = await import('@kbn/vite-server');
 * const loader = createViteModuleLoader({ repoRoot: '/path/to/repo' });
 * await loader.initialize();
 * ```
 */

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
