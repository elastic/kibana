/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
import { CorePreboot, CoreSetup, CoreStart } from '..';

type Maybe<T> = T | undefined;

/**
 * Dedicated type for plugin configuration schema.
 *
 * @public
 */
export type PluginConfigSchema<T> = Type<T>;

/**
 * Type defining the list of configuration properties that will be exposed on the client-side
 * Object properties can either be fully exposed
 *
 * @public
 */
export type ExposedToBrowserDescriptor<T> = {
  [Key in keyof T]?: T[Key] extends Maybe<any[]>
    ? // handles arrays as primitive values
      boolean
    : T[Key] extends Maybe<object>
    ? // can be nested for objects
      ExposedToBrowserDescriptor<T[Key]> | boolean
    : // primitives
      boolean;
};

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
  exposeToBrowser?: ExposedToBrowserDescriptor<T>;
  /**
   * Schema to use to validate the plugin configuration.
   *
   * {@link PluginConfigSchema}
   */
  schema: PluginConfigSchema<T>;
  /**
   * Expose non-default configs to usage collection to be sent via telemetry.
   * set a config to `true` to report the actual changed config value.
   * set a config to `false` to report the changed config value as [redacted].
   *
   * All changed configs except booleans and numbers will be reported
   * as [redacted] unless otherwise specified.
   *
   * {@link MakeUsageFromSchema}
   */
  exposeToUsage?: MakeUsageFromSchema<T>;
}

/**
 * List of configuration values that will be exposed to usage collection.
 * If parent node or actual config path is set to `true` then the actual value
 * of these configs will be reoprted.
 * If parent node or actual config path is set to `false` then the config
 * will be reported as [redacted].
 *
 * @public
 */
export type MakeUsageFromSchema<T> = {
  [Key in keyof T]?: T[Key] extends Maybe<object[]>
    ? // arrays of objects are always redacted
      false
    : T[Key] extends Maybe<any[]>
    ? boolean
    : T[Key] extends Maybe<object>
    ? MakeUsageFromSchema<T[Key]> | boolean
    : boolean;
};

/**
 * Dedicated type for plugin name/id that is supposed to make Map/Set/Arrays
 * that use it as a key or value more obvious.
 *
 * @public
 */
export type PluginName = string;

/** @public */
export type PluginOpaqueId = symbol;

/** @public */
export enum PluginType {
  /**
   * Preboot plugins are special-purpose plugins that only function during preboot stage.
   */
  preboot = 'preboot',
  /**
   * Standard plugins are plugins that start to function as soon as Kibana is fully booted and are active until it shuts down.
   */
  standard = 'standard',
}

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
   * Type of the plugin, defaults to `standard`.
   */
  readonly type: PluginType;

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

  /**
   * Only used for the automatically generated API documentation. Specifying service
   * folders will cause your plugin API reference to be broken up into sub sections.
   */
  readonly serviceFolders?: readonly string[];

  readonly owner: {
    /**
     * The name of the team that currently owns this plugin.
     */
    readonly name: string;
    /**
     * All internal plugins should have a github team specified. GitHub teams can be viewed here:
     * https://github.com/orgs/elastic/teams
     */
    readonly githubTeam?: string;
  };

  /**
   * TODO: make required once all plugins specify this.
   * A brief description of what this plugin does and any capabilities it provides.
   */
  readonly description?: string;

  /**
   * Specifies whether this plugin - and its required dependencies - will be enabled for anonymous pages (login page, status page when
   * configured, etc.) Default is false.
   */
  readonly enabledOnAnonymousPages?: boolean;
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
   * Type of the plugin, defaults to `standard`.
   */
  readonly type: PluginType;

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

  /**
   * Specifies whether this plugin - and its required dependencies - will be enabled for anonymous pages (login page, status page when
   * configured, etc.) Default is false.
   */
  readonly enabledOnAnonymousPages?: boolean;
}

/**
 * @internal
 */
export interface InternalPluginInfo {
  /**
   * Version of the plugin
   */
  readonly version: string;
  /**
   * Bundles that must be loaded for this plugin
   */
  readonly requiredBundles: readonly string[];
  /**
   * Path to the target/public directory of the plugin which should be served
   */
  readonly publicTargetDir: string;
  /**
   * Path to the plugin assets directory.
   */
  readonly publicAssetsDir: string;
}

/**
 * The interface that should be returned by a `PluginInitializer` for a `preboot` plugin.
 *
 * @public
 */
export interface PrebootPlugin<TSetup = void, TPluginsSetup extends object = object> {
  setup(core: CorePreboot, plugins: TPluginsSetup): TSetup;

  stop?(): void;
}

/**
 * The interface that should be returned by a `PluginInitializer` for a `standard` plugin.
 *
 * @public
 */
export interface Plugin<
  TSetup = void,
  TStart = void,
  TPluginsSetup extends object = object,
  TPluginsStart extends object = object
> {
  setup(core: CoreSetup, plugins: TPluginsSetup): TSetup;

  start(core: CoreStart, plugins: TPluginsStart): TStart;

  stop?(): void;
}

/**
 * A plugin with asynchronous lifecycle methods.
 *
 * @deprecated Asynchronous lifecycles are deprecated, and should be migrated to sync {@link Plugin | plugin}
 * @public
 */
export interface AsyncPlugin<
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
  kibana: ['index'] as const,
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
    configs: readonly string[];
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
> = (
  core: PluginInitializerContext
) =>
  | Plugin<TSetup, TStart, TPluginsSetup, TPluginsStart>
  | PrebootPlugin<TSetup, TPluginsSetup>
  | AsyncPlugin<TSetup, TStart, TPluginsSetup, TPluginsStart>;
