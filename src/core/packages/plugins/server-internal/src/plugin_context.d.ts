import type { CoreContext } from '@kbn/core-base-server-internal';
import type { PluginOpaqueId } from '@kbn/core-base-common';
import type { NodeInfo } from '@kbn/core-node-server';
import type { PluginInitializerContext, PluginManifest } from '@kbn/core-plugins-server';
import type { CorePreboot, CoreSetup, CoreStart } from '@kbn/core-lifecycle-server';
import type { PluginWrapper } from './plugin';
import type { PluginsServicePrebootSetupDeps, PluginsServiceSetupDeps, PluginsServiceStartDeps } from './plugins_service';
import type { IRuntimePluginContractResolver } from './plugin_contract_resolver';
/** @internal */
export interface InstanceInfo {
    uuid: string;
    airgapped: boolean;
}
/**
 * This returns a facade for `CoreContext` that will be exposed to the plugin initializer.
 * This facade should be safe to use across entire plugin lifespan.
 *
 * This is called for each plugin when it's created, so each plugin gets its own
 * version of these values.
 *
 * We should aim to be restrictive and specific in the APIs that we expose.
 *
 * @param coreContext Kibana core context
 * @param opaqueId The opaque id created for this particular plugin.
 * @param manifest The manifest of the plugin we're building these values for.
 * @param instanceInfo Info about the instance Kibana is running on.
 * @param nodeInfo Info about how the Kibana process has been configured.
 *
 * @internal
 */
export declare function createPluginInitializerContext({ coreContext, opaqueId, manifest, instanceInfo, nodeInfo, }: {
    coreContext: CoreContext;
    opaqueId: PluginOpaqueId;
    manifest: PluginManifest;
    instanceInfo: InstanceInfo;
    nodeInfo: NodeInfo;
}): PluginInitializerContext;
/**
 * Provides `CorePreboot` contract that will be exposed to the `preboot` plugin `setup` method.
 * This contract should be safe to use only within `setup` itself.
 *
 * This is called for each `preboot` plugin when it's set up, so each plugin gets its own
 * version of these values.
 *
 * We should aim to be restrictive and specific in the APIs that we expose.
 *
 * @param coreContext Kibana core context
 * @param deps Dependencies that Plugins services gets during setup.
 * @param plugin The plugin we're building these values for.
 * @internal
 */
export declare function createPluginPrebootSetupContext({ deps, plugin, }: {
    deps: PluginsServicePrebootSetupDeps;
    plugin: PluginWrapper;
}): CorePreboot;
/**
 * This returns a facade for `CoreContext` that will be exposed to the plugin `setup` method.
 * This facade should be safe to use only within `setup` itself.
 *
 * This is called for each plugin when it's set up, so each plugin gets its own
 * version of these values.
 *
 * We should aim to be restrictive and specific in the APIs that we expose.
 *
 * @param coreContext Kibana core context
 * @param plugin The plugin we're building these values for.
 * @param deps Dependencies that Plugins services gets during setup.
 * @internal
 */
export declare function createPluginSetupContext<TPlugin, TPluginDependencies>({ deps, plugin, runtimeResolver, }: {
    deps: PluginsServiceSetupDeps;
    plugin: PluginWrapper<TPlugin, TPluginDependencies>;
    runtimeResolver: IRuntimePluginContractResolver;
}): CoreSetup;
/**
 * This returns a facade for `CoreContext` that will be exposed to the plugin `start` method.
 * This facade should be safe to use only within `start` itself.
 *
 * This is called for each plugin when it starts, so each plugin gets its own
 * version of these values.
 *
 * @param coreContext Kibana core context
 * @param plugin The plugin we're building these values for.
 * @param deps Dependencies that Plugins services gets during start.
 * @internal
 */ export declare function createPluginStartContext<TPlugin, TPluginDependencies>({ plugin, deps, runtimeResolver, }: {
    deps: PluginsServiceStartDeps;
    plugin: PluginWrapper<TPlugin, TPluginDependencies>;
    runtimeResolver: IRuntimePluginContractResolver;
}): CoreStart;
