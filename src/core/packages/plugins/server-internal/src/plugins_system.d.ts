import type { DiscoveredPlugin, PluginName } from '@kbn/core-base-common';
import type { CoreContext } from '@kbn/core-base-server-internal';
import { PluginType } from '@kbn/core-base-common';
import type { PluginWrapper } from './plugin';
import { type PluginDependencies } from './types';
import type { PluginsServicePrebootSetupDeps, PluginsServiceSetupDeps, PluginsServiceStartDeps } from './plugins_service';
/** @internal */
export declare class PluginsSystem<T extends PluginType> {
    private readonly coreContext;
    readonly type: T;
    private readonly runtimeResolver;
    private readonly plugins;
    private readonly log;
    private readonly satupPlugins;
    private sortedPluginNames?;
    constructor(coreContext: CoreContext, type: T);
    addPlugin(plugin: PluginWrapper): void;
    getPlugins(): PluginWrapper<unknown, unknown, object, object>[];
    /**
     * @returns a Map of each plugin and an Array of its available dependencies
     * @internal
     */
    getPluginDependencies(): PluginDependencies;
    setupPlugins(deps: T extends PluginType.preboot ? PluginsServicePrebootSetupDeps : PluginsServiceSetupDeps): Promise<Map<string, unknown>>;
    startPlugins(deps: PluginsServiceStartDeps): Promise<Map<string, unknown>>;
    stopPlugins(): Promise<void>;
    /**
     * Get a Map of all discovered UI plugins in topological order.
     */
    uiPlugins(): Map<string, DiscoveredPlugin>;
    private getTopologicallySortedPluginNames;
}
/**
 * Finds all circular dependencies in the plugin graph
 * @param dependencyGraph Map of plugin names to their unresolved dependencies
 * @returns Array of circular dependency paths
 */
export declare const findCircularDependencies: (dependencyGraph: Map<PluginName, Set<PluginName>>) => PluginName[][];
/**
 * Normalizes a cycle by rotating it to start with the alphabetically first node
 * This helps identify duplicate cycles regardless of where we start traversing
 */
export declare const normalizeCycle: (cycle: PluginName[]) => PluginName[];
