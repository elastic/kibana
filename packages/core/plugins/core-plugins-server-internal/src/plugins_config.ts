/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { get } from 'lodash';
import { Env } from '@kbn/config';
import type { ServiceConfigDescriptor } from '@kbn/core-base-server-internal';

const configSchema = schema.object({
  initialize: schema.boolean({ defaultValue: true }),

  /**
   * Defines an array of directories where another plugin should be loaded from.
   */
  paths: schema.arrayOf(schema.string(), { defaultValue: [] }),
  /**
   * Internal config, not intended to be used by end users. Only for specific
   * internal purposes.
   */
  __internal__: schema.maybe(
    schema.object({ enableAllPlugins: schema.boolean({ defaultValue: false }) })
  ),
});

type InternalPluginsConfigType = TypeOf<typeof configSchema>;

export type PluginsConfigType = Omit<InternalPluginsConfigType, '__internal__'>;

export const config: ServiceConfigDescriptor<PluginsConfigType> = {
  path: 'plugins',
  schema: configSchema,
};

/** @internal */
export class PluginsConfig {
  /**
   * Indicates whether or not plugins should be initialized.
   */
  public readonly initialize: boolean;

  /**
   * Defines directories that we should scan for the plugin subdirectories.
   */
  public readonly pluginSearchPaths: readonly string[];

  /**
   * Defines directories where an additional plugin exists.
   */
  public readonly additionalPluginPaths: readonly string[];

  /**
   * Whether to enable all plugins.
   *
   * @note this is intended to be an undocumented setting.
   */
  public readonly shouldEnableAllPlugins: boolean;

  constructor(rawConfig: PluginsConfigType, env: Env) {
    this.initialize = rawConfig.initialize;
    this.pluginSearchPaths = env.pluginSearchPaths;
    this.additionalPluginPaths = rawConfig.paths;
    this.shouldEnableAllPlugins = get(rawConfig, '__internal__.enableAllPlugins', false);
  }
}
