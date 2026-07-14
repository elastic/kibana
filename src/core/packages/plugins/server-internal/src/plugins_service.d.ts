import type { CoreContext, CoreService } from '@kbn/core-base-server-internal';
import { type PluginName, PluginType } from '@kbn/core-base-common';
import type { InternalEnvironmentServicePreboot } from '@kbn/core-environment-server-internal';
import type { InternalNodeServicePreboot } from '@kbn/core-node-server-internal';
import type { UiPlugins } from '@kbn/core-plugins-base-server-internal';
import type { InternalCorePreboot, InternalCoreSetup, InternalCoreStart } from '@kbn/core-lifecycle-server-internal';
import type { PluginDependencies } from './types';
/** @internal */
export type DiscoveredPlugins = {
    [key in PluginType]: {
        pluginTree: PluginDependencies;
        pluginPaths: string[];
        uiPlugins: UiPlugins;
    };
};
/** @internal */
export interface InternalPluginsServiceSetup {
    /** Indicates whether or not plugins were initialized. */
    initialized: boolean;
    /** Setup contracts returned by plugins. */
    contracts: Map<PluginName, unknown>;
}
/** @internal */
export interface InternalPluginsServiceStart {
    /** Start contracts returned by plugins. */
    contracts: Map<PluginName, unknown>;
}
/** @internal */
export type PluginsServicePrebootSetupDeps = InternalCorePreboot;
/** @internal */
export type PluginsServiceSetupDeps = InternalCoreSetup;
/** @internal */
export type PluginsServiceStartDeps = InternalCoreStart;
/** @internal */
export interface PluginsServiceDiscoverDeps {
    environment: InternalEnvironmentServicePreboot;
    node: InternalNodeServicePreboot;
}
/** @internal */
export declare class PluginsService implements CoreService<InternalPluginsServiceSetup, InternalPluginsServiceStart> {
    private readonly coreContext;
    private readonly log;
    private readonly prebootPluginsSystem;
    private arePrebootPluginsStopped;
    private readonly prebootUiPluginInternalInfo;
    private readonly standardPluginsSystem;
    private readonly standardUiPluginInternalInfo;
    private readonly configService;
    private readonly config$;
    private readonly pluginConfigDescriptors;
    private readonly pluginConfigUsageDescriptors;
    constructor(coreContext: CoreContext);
    discover({ environment, node, }: PluginsServiceDiscoverDeps): Promise<DiscoveredPlugins>;
    getExposedPluginConfigsToUsage(): Map<string, Record<string, any>>;
    preboot(deps: PluginsServicePrebootSetupDeps): Promise<void>;
    setup(deps: PluginsServiceSetupDeps): Promise<{
        initialized: boolean;
        contracts: Map<string, unknown>;
    }>;
    start(deps: PluginsServiceStartDeps): Promise<{
        contracts: Map<any, any>;
    }>;
    stop(): Promise<void>;
    private generateUiPluginsConfigs;
    private handleDiscoveryErrors;
    private handleDiscoveredPlugins;
    /** Throws an error if the plugin's dependencies are invalid. */
    private validatePluginDependencies;
}
