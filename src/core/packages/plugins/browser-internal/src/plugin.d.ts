import type { DiscoveredPlugin, PluginOpaqueId } from '@kbn/core-base-common';
import type { CoreStart, CoreSetup } from '@kbn/core-lifecycle-browser';
import type { PluginInitializerContext } from '@kbn/core-plugins-browser';
/**
 * Lightweight wrapper around discovered plugin that is responsible for instantiating
 * plugin and dispatching proper context and dependencies into plugin's lifecycle hooks.
 *
 * @internal
 */
export declare class PluginWrapper<TSetup = unknown, TStart = unknown, TPluginsSetup extends object = object, TPluginsStart extends object = object> {
    readonly discoveredPlugin: DiscoveredPlugin;
    readonly opaqueId: PluginOpaqueId;
    private readonly initializerContext;
    readonly name: DiscoveredPlugin['id'];
    readonly configPath: DiscoveredPlugin['configPath'];
    readonly requiredPlugins: DiscoveredPlugin['requiredPlugins'];
    readonly optionalPlugins: DiscoveredPlugin['optionalPlugins'];
    readonly runtimePluginDependencies: DiscoveredPlugin['runtimePluginDependencies'];
    private definition?;
    private instance?;
    private container?;
    private readonly startDependencies$;
    readonly startDependencies: Promise<[CoreStart, TPluginsStart, TStart]>;
    constructor(discoveredPlugin: DiscoveredPlugin, opaqueId: PluginOpaqueId, initializerContext: PluginInitializerContext);
    /**
     * Instantiates plugin and calls `setup` function exposed by the plugin initializer.
     * @param setupContext Context that consists of various core services tailored specifically
     * for the `setup` lifecycle event.
     * @param plugins The dictionary where the key is the dependency name and the value
     * is the contract returned by the dependency's `setup` function.
     */
    setup(setupContext: CoreSetup<TPluginsStart, TStart>, plugins: TPluginsSetup): TSetup;
    /**
     * Calls `setup` function exposed by the initialized plugin.
     * @param startContext Context that consists of various core services tailored specifically
     * for the `start` lifecycle event.
     * @param plugins The dictionary where the key is the dependency name and the value
     * is the contract returned by the dependency's `start` function.
     */
    start(startContext: CoreStart, plugins: TPluginsStart): TStart;
    /**
     * Calls optional `stop` function exposed by the plugin initializer.
     */
    stop(): Promise<void>;
    private createPluginInstance;
}
