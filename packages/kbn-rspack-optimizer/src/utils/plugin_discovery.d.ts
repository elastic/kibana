/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PluginEntry } from '../types';
export type { PluginEntry };
export interface DiscoverPluginsOptions {
  repoRoot: string;
  examples?: boolean;
  testPlugins?: boolean;
}
/**
 * Discover all Kibana plugins with UI bundles using the repo package map.
 */
export declare function discoverPlugins(options: DiscoverPluginsOptions): Promise<PluginEntry[]>;
/**
 * Resolve the absolute path to package-map.json from @kbn/repo-packages.
 * Used by the watch plugin to detect new/removed packages.
 */
export declare function getPackageMapPath(): string;
/**
 * Create the core entry configuration.
 */
export declare function createCoreEntry(repoRoot: string): PluginEntry;
