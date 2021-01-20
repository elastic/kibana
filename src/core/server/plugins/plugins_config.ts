/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { Env } from '../config';

export type PluginsConfigType = TypeOf<typeof config.schema>;

export const config = {
  path: 'plugins',
  schema: schema.object({
    initialize: schema.boolean({ defaultValue: true }),

    /**
     * Defines an array of directories where another plugin should be loaded from.
     */
    paths: schema.arrayOf(schema.string(), { defaultValue: [] }),
  }),
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

  constructor(rawConfig: PluginsConfigType, env: Env) {
    this.initialize = rawConfig.initialize;
    this.pluginSearchPaths = env.pluginSearchPaths;
    this.additionalPluginPaths = rawConfig.paths;
  }
}
