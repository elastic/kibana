/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TypeOf } from '@kbn/config-schema';
import { type Type } from '@kbn/config-schema';
import type { Env } from '@kbn/config';
import type { ServiceConfigDescriptor } from '@kbn/core-base-server-internal';
import { type KibanaGroup } from '@kbn/projects-solutions-groups';
declare const configSchema: import('@kbn/config-schema').ObjectType<{
  initialize: Type<boolean>;
  /**
   * Defines an array of directories where another plugin should be loaded from.
   */
  paths: Type<string[]>;
  /**
   * Defines an array of groups to include when loading plugins.
   * Plugins from all groups will be taken into account if the parameter is not provided.
   */
  allowlistPluginGroups: Type<
    | ('observability' | 'platform' | 'search' | 'security' | 'vectordb' | 'workplaceai')[]
    | undefined
  >;
  /**
   * Internal config, not intended to be used by end users. Only for specific
   * internal purposes.
   */
  forceEnableAllPlugins: Type<boolean | undefined>;
  /**
   * Internal config, not intended to be used by end users. When enabled, the
   * browser exposes an inert `window.__kbnNavDependencies__()` bridge that
   * reports cross-plugin navigation dependencies. Only consumed by the
   * navigation dependency enforcement test.
   */
  exposeNavDependencies: Type<boolean | undefined>;
}>;
type InternalPluginsConfigType = TypeOf<typeof configSchema>;
export type PluginsConfigType = Omit<InternalPluginsConfigType, '__internal__'>;
export declare const config: ServiceConfigDescriptor<PluginsConfigType>;
/** @internal */
export declare class PluginsConfig {
  /**
   * Indicates whether or not plugins should be initialized.
   */
  readonly initialize: boolean;
  /**
   * Defines directories that we should scan for the plugin subdirectories.
   */
  readonly pluginSearchPaths: readonly string[];
  /**
   * Defines directories where an additional plugin exists.
   */
  readonly additionalPluginPaths: readonly string[];
  /**
   * Whether to enable all plugins.
   *
   * @note this is intended to be an undocumented setting.
   */
  readonly shouldEnableAllPlugins: boolean;
  /**
   * Specify an allowlist of plugin groups.
   * Allows reducing the amount of plugins that are taken into account.
   * The list will default to "all plugin groups" if the config is not present.
   */
  readonly allowlistPluginGroups?: readonly KibanaGroup[];
  constructor(rawConfig: PluginsConfigType, env: Env);
}
export {};
