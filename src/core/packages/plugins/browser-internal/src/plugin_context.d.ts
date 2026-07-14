import type { CoreContext } from '@kbn/core-base-browser-internal';
import type { DiscoveredPlugin, PluginOpaqueId } from '@kbn/core-base-common';
import type { CoreSetup, CoreStart } from '@kbn/core-lifecycle-browser';
import type { PluginInitializerContext } from '@kbn/core-plugins-browser';
import type { PluginWrapper } from './plugin';
import type { PluginsServiceSetupDeps, PluginsServiceStartDeps } from './plugins_service';
import type { IRuntimePluginContractResolver } from './plugin_contract_resolver';
/**
 * Provides a plugin-specific context passed to the plugin's constructor. This is currently
 * empty but should provide static services in the future, such as config and logging.
 *
 * @param coreContext
 * @param opaqueId
 * @param pluginManifest
 * @param pluginConfig
 * @internal
 */
export declare function createPluginInitializerContext(coreContext: CoreContext, opaqueId: PluginOpaqueId, pluginManifest: DiscoveredPlugin, pluginConfig: {
    [key: string]: unknown;
}): PluginInitializerContext;
/**
 * Provides a plugin-specific context passed to the plugin's `setup` lifecycle event. Currently
 * this returns a shallow copy the service setup contracts, but in the future could provide
 * plugin-scoped versions of the service.
 *
 * @param coreContext
 * @param deps
 * @param plugin
 * @internal
 */
export declare function createPluginSetupContext<TSetup, TStart, TPluginsSetup extends object, TPluginsStart extends object>({ deps, plugin, runtimeResolver, }: {
    deps: PluginsServiceSetupDeps;
    plugin: PluginWrapper<TSetup, TStart, TPluginsSetup, TPluginsStart>;
    runtimeResolver: IRuntimePluginContractResolver;
}): CoreSetup;
/**
 * Provides a plugin-specific context passed to the plugin's `start` lifecycle event. Currently
 * this returns a shallow copy the service start contracts, but in the future could provide
 * plugin-scoped versions of the service.
 *
 * @param coreContext
 * @param deps
 * @param plugin
 * @internal
 */
export declare function createPluginStartContext<TSetup, TStart, TPluginsSetup extends object, TPluginsStart extends object>({ deps, plugin, runtimeResolver, }: {
    deps: PluginsServiceStartDeps;
    plugin: PluginWrapper<TSetup, TStart, TPluginsSetup, TPluginsStart>;
    runtimeResolver: IRuntimePluginContractResolver;
}): CoreStart;
