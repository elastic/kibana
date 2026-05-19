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
