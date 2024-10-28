/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { Env } from '@kbn/config';

export const pluginsConfigSchema = schema.object(
  {
    paths: schema.arrayOf(schema.string(), { defaultValue: [] }),
  },
  { unknowns: 'ignore' }
);

export type PluginsConfigType = TypeOf<typeof pluginsConfigSchema>;

/** @internal */
export class PluginsConfig {
  /**
   * Defines directories that we should scan for the plugin subdirectories.
   */
  public readonly pluginSearchPaths: string[];

  /**
   * Defines directories where an additional plugin exists.
   */
  public readonly additionalPluginPaths: string[];

  constructor(rawConfig: PluginsConfigType, env: Env) {
    this.pluginSearchPaths = [...env.pluginSearchPaths];
    this.additionalPluginPaths = rawConfig.paths;
  }
}
