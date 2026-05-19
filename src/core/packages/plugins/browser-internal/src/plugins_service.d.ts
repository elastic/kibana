import type { CoreService, CoreContext } from '@kbn/core-base-browser-internal';
import type { PluginOpaqueId } from '@kbn/core-base-common';
import type { InjectedMetadataPlugin } from '@kbn/core-injected-metadata-common-internal';
import type { InternalCoreSetup, InternalCoreStart } from '@kbn/core-lifecycle-browser-internal';
/** @internal */
export type PluginsServiceSetupDeps = InternalCoreSetup;
/** @internal */
export type PluginsServiceStartDeps = InternalCoreStart;
/** @internal */
export interface InternalPluginsServiceSetup {
    contracts: ReadonlyMap<string, unknown>;
}
/** @internal */
export interface InternalPluginsServiceStart {
    contracts: ReadonlyMap<string, unknown>;
}
/**
 * Service responsible for loading plugin bundles, initializing plugins, and managing the lifecycle
 * of all plugins.
 *
 * @internal
 */
export declare class PluginsService implements CoreService<InternalPluginsServiceSetup, InternalPluginsServiceStart> {
    private readonly coreContext;
    private readonly runtimeResolver;
    /** Plugin wrappers in topological order. */
    private readonly plugins;
    private readonly pluginDependencies;
    private readonly satupPlugins;
    constructor(coreContext: CoreContext, plugins: InjectedMetadataPlugin[]);
    getOpaqueIds(): ReadonlyMap<PluginOpaqueId, PluginOpaqueId[]>;
    setup(deps: PluginsServiceSetupDeps): Promise<InternalPluginsServiceSetup>;
    start(deps: PluginsServiceStartDeps): Promise<InternalPluginsServiceStart>;
    stop(): Promise<void>;
}
