/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ConfigPath } from '@kbn/config';

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
   * An optional list of plugin dependencies that can be resolved dynamically at runtime
   * using the dynamic contract resolving capabilities from the plugin service.
   */
  readonly runtimePluginDependencies: readonly PluginName[];

  /**
   * Specifies whether this plugin - and its required dependencies - will be enabled for anonymous pages (login page, status page when
   * configured, etc.) Default is false.
   */
  readonly enabledOnAnonymousPages?: boolean;
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
   * An optional list of plugin dependencies that can be resolved dynamically at runtime
   * using the dynamic contract resolving capabilities from the plugin service.
   */
  readonly runtimePluginDependencies: readonly string[];

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
   * @deprecated To be deleted when https://github.com/elastic/kibana/issues/101948 is done.
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
