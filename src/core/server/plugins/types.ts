/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Observable } from 'rxjs';
import { Type } from '@kbn/config-schema';
import { RecursiveReadonly } from '@kbn/utility-types';
import { PathConfigType } from '@kbn/utils';

import { ConfigPath, EnvironmentMode, PackageInfo, ConfigDeprecationProvider } from '../config';
import { LoggerFactory } from '../logging';
import { KibanaConfigType } from '../kibana_config';
import { ElasticsearchConfigType } from '../elasticsearch/elasticsearch_config';
import { SavedObjectsConfigType } from '../saved_objects/saved_objects_config';
import { CoreSetup, CoreStart } from '..';

/**
 * Dedicated type for plugin configuration schema.
 *
 * @public
 */
export type PluginConfigSchema<T> = Type<T>;

/**
 * Describes a plugin configuration properties.
 *
 * @example
 * ```typescript
 * // my_plugin/server/index.ts
 * import { schema, TypeOf } from '@kbn/config-schema';
 * import { PluginConfigDescriptor } from 'kibana/server';
 *
 * const configSchema = schema.object({
 *   secret: schema.string({ defaultValue: 'Only on server' }),
 *   uiProp: schema.string({ defaultValue: 'Accessible from client' }),
 * });
 *
 * type ConfigType = TypeOf<typeof configSchema>;
 *
 * export const config: PluginConfigDescriptor<ConfigType> = {
 *   exposeToBrowser: {
 *     uiProp: true,
 *   },
 *   schema: configSchema,
 *   deprecations: ({ rename, unused }) => [
 *     rename('securityKey', 'secret'),
 *     unused('deprecatedProperty'),
 *   ],
 * };
 * ```
 *
 * @public
 */
export interface PluginConfigDescriptor<T = any> {
  /**
   * Provider for the {@link ConfigDeprecation} to apply to the plugin configuration.
   */
  deprecations?: ConfigDeprecationProvider;
  /**
   * List of configuration properties that will be available on the client-side plugin.
   */
  exposeToBrowser?: { [P in keyof T]?: boolean };
  /**
   * Schema to use to validate the plugin configuration.
   *
   * {@link PluginConfigSchema}
   */
  schema: PluginConfigSchema<T>;
}

/**
 * Dedicated type for plugin name/id that is supposed to make Map/Set/Arrays
 * that use it as a key or value more obvious.
 *
 * @public
 */
export type PluginName = string;

/** @public */
export type PluginOpaqueId = symbol;

/** @internal */
export interface PluginDependencies {
  asNames: ReadonlyMap<PluginName, PluginName[]>;
  asOpaqueIds: ReadonlyMap<PluginOpaqueId, PluginOpaqueId[]>;
}

/**
 * Describes the set of required and optional properties plugin can define in its
 * mandatory JSON manifest file.
 *
 * @remarks
 * Should never be used in code outside of Core but is exported for
 * documentation purposes.
 *
 * @public
 */
export interface PluginManifest {
  /**
   * Identifier of the plugin. Must be a string in camelCase. Part of a plugin public contract.
   * Other plugins leverage it to access plugin API, navigate to the plugin, etc.
   */
  readonly id: PluginName;

  /**
   * Version of the plugin.
   */
  readonly version: string;

  /**
   * The version of Kibana the plugin is compatible with, defaults to "version".
   */
  readonly kibanaVersion: string;

  /**
   * Root {@link ConfigPath | configuration path} used by the plugin, defaults
   * to "id" in snake_case format.
   *
   * @example
   * id: myPlugin
   * configPath: my_plugin
   */
  readonly configPath: ConfigPath;

  /**
   * An optional list of the other plugins that **must be** installed and enabled
   * for this plugin to function properly.
   */
  readonly requiredPlugins: readonly PluginName[];

  /**
   * List of plugin ids that this plugin's UI code imports modules from that are
   * not in `requiredPlugins`.
   *
   * @remarks
   * The plugins listed here will be loaded in the browser, even if the plugin is
   * disabled. Required by `@kbn/optimizer` to support cross-plugin imports.
   * "core" and plugins already listed in `requiredPlugins` do not need to be
   * duplicated here.
   */
  readonly requiredBundles: readonly string[];

  /**
   * An optional list of the other plugins that if installed and enabled **may be**
   * leveraged by this plugin for some additional functionality but otherwise are
   * not required for this plugin to work properly.
   */
  readonly optionalPlugins: readonly PluginName[];

  /**
   * Specifies whether plugin includes some client/browser specific functionality
   * that should be included into client bundle via `public/ui_plugin.js` file.
   */
  readonly ui: boolean;

  /**
   * Specifies whether plugin includes some server-side specific functionality.
   */
  readonly server: boolean;

  /**
   * Specifies directory names that can be imported by other ui-plugins built
   * using the same instance of the @kbn/optimizer. A temporary measure we plan
   * to replace with better mechanisms for sharing static code between plugins
   * @deprecated
   */
  readonly extraPublicDirs?: string[];
}

/**
 * Small container object used to expose information about discovered plugins that may
 * or may not have been started.
 * @public
 */
export interface DiscoveredPlugin {
  /**
   * Identifier of the plugin.
   */
  readonly id: PluginName;

  /**
   * Root configuration path used by the plugin, defaults to "id" in snake_case format.
   */
  readonly configPath: ConfigPath;

  /**
   * An optional list of the other plugins that **must be** installed and enabled
   * for this plugin to function properly.
   */
  readonly requiredPlugins: readonly PluginName[];

  /**
   * An optional list of the other plugins that if installed and enabled **may be**
   * leveraged by this plugin for some additional functionality but otherwise are
   * not required for this plugin to work properly.
   */
  readonly optionalPlugins: readonly PluginName[];

  /**
   * List of plugin ids that this plugin's UI code imports modules from that are
   * not in `requiredPlugins`.
   *
   * @remarks
   * The plugins listed here will be loaded in the browser, even if the plugin is
   * disabled. Required by `@kbn/optimizer` to support cross-plugin imports.
   * "core" and plugins already listed in `requiredPlugins` do not need to be
   * duplicated here.
   */
  readonly requiredBundles: readonly PluginName[];
}

/**
 * @internal
 */
export interface InternalPluginInfo {
  /**
   * Bundles that must be loaded for this plugoin
   */
  readonly requiredBundles: readonly string[];
  /**
   * Path to the target/public directory of the plugin which should be
   * served
   */
  readonly publicTargetDir: string;
  /**
   * Path to the plugin assets directory.
   */
  readonly publicAssetsDir: string;
}

/**
 * The interface that should be returned by a `PluginInitializer`.
 *
 * @public
 */
export interface Plugin<
  TSetup = void,
  TStart = void,
  TPluginsSetup extends object = object,
  TPluginsStart extends object = object
> {
  setup(core: CoreSetup, plugins: TPluginsSetup): TSetup | Promise<TSetup>;
  start(core: CoreStart, plugins: TPluginsStart): TStart | Promise<TStart>;
  stop?(): void;
}

export const SharedGlobalConfigKeys = {
  // We can add more if really needed
  kibana: ['index', 'autocompleteTerminateAfter', 'autocompleteTimeout'] as const,
  elasticsearch: ['shardTimeout', 'requestTimeout', 'pingTimeout'] as const,
  path: ['data'] as const,
  savedObjects: ['maxImportPayloadBytes'] as const,
};

/**
 * @public
 */
export type SharedGlobalConfig = RecursiveReadonly<{
  kibana: Pick<KibanaConfigType, typeof SharedGlobalConfigKeys.kibana[number]>;
  elasticsearch: Pick<ElasticsearchConfigType, typeof SharedGlobalConfigKeys.elasticsearch[number]>;
  path: Pick<PathConfigType, typeof SharedGlobalConfigKeys.path[number]>;
  savedObjects: Pick<SavedObjectsConfigType, typeof SharedGlobalConfigKeys.savedObjects[number]>;
}>;

/**
 * Context that's available to plugins during initialization stage.
 *
 * @public
 */
export interface PluginInitializerContext<ConfigSchema = unknown> {
  opaqueId: PluginOpaqueId;
  env: {
    mode: EnvironmentMode;
    packageInfo: Readonly<PackageInfo>;
    instanceUuid: string;
  };
  /**
   * {@link LoggerFactory | logger factory} instance already bound to the plugin's logging context
   *
   * @example
   * ```typescript
   * // plugins/my-plugin/server/plugin.ts
   * // "id: myPlugin" in `plugins/my-plugin/kibana.yaml`
   *
   * export class MyPlugin implements Plugin  {
   *   constructor(private readonly initContext: PluginInitializerContext) {
   *     this.logger = initContext.logger.get();
   *     // `logger` context: `plugins.myPlugin`
   *     this.mySubLogger = initContext.logger.get('sub'); // or this.logger.get('sub');
   *     // `mySubLogger` context: `plugins.myPlugin.sub`
   *   }
   * }
   * ```
   */
  logger: LoggerFactory;
  /**
   * Accessors for the plugin's configuration
   */
  config: {
    /**
     * Provide access to Kibana legacy configuration values.
     *
     * @remarks Naming not final here, it may be renamed in a near future
     * @deprecated Accessing configuration values outside of the plugin's config scope is highly discouraged
     */
    legacy: {
      globalConfig$: Observable<SharedGlobalConfig>;
      get: () => SharedGlobalConfig;
    };
    /**
     * Return an observable of the plugin's configuration
     *
     * @example
     * ```typescript
     * // plugins/my-plugin/server/plugin.ts
     *
     * export class MyPlugin implements Plugin {
     *   constructor(private readonly initContext: PluginInitializerContext) {}
     *   setup(core) {
     *     this.configSub = this.initContext.config.create<MyPluginConfigType>().subscribe((config) => {
     *       this.myService.reconfigure(config);
     *     });
     *   }
     *   stop() {
     *     this.configSub.unsubscribe();
     *   }
     * ```
     *
     * @example
     * ```typescript
     * // plugins/my-plugin/server/plugin.ts
     *
     * export class MyPlugin implements Plugin {
     *   constructor(private readonly initContext: PluginInitializerContext) {}
     *   async setup(core) {
     *     this.config = await this.initContext.config.create<MyPluginConfigType>().pipe(take(1)).toPromise();
     *   }
     *   stop() {
     *     this.configSub.unsubscribe();
     *   }
     * ```
     *
     * @remarks The underlying observable has a replay effect, meaning that awaiting for the first emission
     *          will be resolved at next tick, without risks to delay any asynchronous code's workflow.
     */
    create: <T = ConfigSchema>() => Observable<T>;
    /**
     * Return the current value of the plugin's configuration synchronously.
     *
     * @example
     * ```typescript
     * // plugins/my-plugin/server/plugin.ts
     *
     * export class MyPlugin implements Plugin {
     *   constructor(private readonly initContext: PluginInitializerContext) {}
     *   setup(core) {
     *     const config = this.initContext.config.get<MyPluginConfigType>();
     *     // do something with the config
     *   }
     * }
     * ```
     *
     * @remarks This should only be used when synchronous access is an absolute necessity, such
     *          as during the plugin's setup or start lifecycle. For all other usages,
     *          {@link create} should be used instead.
     */
    get: <T = ConfigSchema>() => T;
  };
}

/**
 * The `plugin` export at the root of a plugin's `server` directory should conform
 * to this interface.
 *
 * @public
 */
export type PluginInitializer<
  TSetup,
  TStart,
  TPluginsSetup extends object = object,
  TPluginsStart extends object = object
> = (core: PluginInitializerContext) => Plugin<TSetup, TStart, TPluginsSetup, TPluginsStart>;
