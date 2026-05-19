import type { ContainerModule } from 'inversify';
import { type PluginOpaqueId } from '@kbn/core-base-common';
import type { Plugin, PluginConfigDescriptor, PluginInitializer, PluginInitializerContext, PluginManifest, PrebootPlugin } from '@kbn/core-plugins-server';
import type { CorePreboot, CoreSetup, CoreStart } from '@kbn/core-lifecycle-server';
interface PluginDefinition<TSetup = unknown, TStart = unknown, TPluginsSetup extends object = object, TPluginsStart extends object = object> {
    readonly config?: PluginConfigDescriptor;
    readonly module?: ContainerModule;
    readonly plugin?: PluginInitializer<TSetup, TStart, TPluginsSetup, TPluginsStart>;
}
/**
 * Lightweight wrapper around discovered plugin that is responsible for instantiating
 * plugin and dispatching proper context and dependencies into plugin's lifecycle hooks.
 *
 * @internal
 */
export declare class PluginWrapper<TSetup = unknown, TStart = unknown, TPluginsSetup extends object = object, TPluginsStart extends object = object> {
    readonly params: {
        readonly path: string;
        readonly manifest: PluginManifest;
        readonly opaqueId: PluginOpaqueId;
        readonly initializerContext: PluginInitializerContext;
    };
    readonly path: string;
    readonly source: 'oss' | 'x-pack' | 'external';
    readonly manifest: PluginManifest;
    readonly opaqueId: PluginOpaqueId;
    readonly name: PluginManifest['id'];
    readonly configPath: PluginManifest['configPath'];
    readonly requiredPlugins: PluginManifest['requiredPlugins'];
    readonly optionalPlugins: PluginManifest['optionalPlugins'];
    readonly runtimePluginDependencies: PluginManifest['runtimePluginDependencies'];
    readonly requiredBundles: PluginManifest['requiredBundles'];
    readonly includesServerPlugin: PluginManifest['server'];
    readonly includesUiPlugin: PluginManifest['ui'];
    private readonly log;
    private readonly initializerContext;
    private definition?;
    private instance?;
    private container?;
    private readonly startDependencies$;
    readonly startDependencies: Promise<[CoreStart, TPluginsStart, TStart | undefined]>;
    constructor(params: {
        readonly path: string;
        readonly manifest: PluginManifest;
        readonly opaqueId: PluginOpaqueId;
        readonly initializerContext: PluginInitializerContext;
    });
    init(): Promise<void>;
    /**
     * Instantiates plugin and calls `setup` function exposed by the plugin initializer.
     * @param setupContext Context that consists of various core services tailored specifically
     * for the `setup` lifecycle event.
     * @param plugins The dictionary where the key is the dependency name and the value
     * is the contract returned by the dependency's `setup` function.
     */
    setup(setupContext: CoreSetup<TPluginsStart, TStart> | CorePreboot, plugins: TPluginsSetup): TSetup | Promise<TSetup>;
    /**
     * Calls `start` function exposed by the initialized plugin.
     * @param startContext Context that consists of various core services tailored specifically
     * for the `start` lifecycle event.
     * @param plugins The dictionary where the key is the dependency name and the value
     * is the contract returned by the dependency's `start` function.
     */
    start(startContext: CoreStart, plugins: TPluginsStart): TStart | Promise<TStart>;
    /**
     * Calls optional `stop` function exposed by the plugin initializer.
     */
    stop(): Promise<void>;
    getConfigDescriptor(): Promise<PluginConfigDescriptor | null>;
    protected getPluginDefinition(): Promise<PluginDefinition<TSetup, TStart, TPluginsSetup, TPluginsStart>>;
    protected createPluginInstance(): Promise<Plugin<TSetup, TStart, TPluginsSetup, TPluginsStart> | PrebootPlugin<TSetup, TPluginsSetup> | undefined>;
    private isPrebootPluginInstance;
}
export {};
