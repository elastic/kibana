/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { Env } from '../config';

const pluginsSchema = schema.object({
  initialize: schema.boolean({ defaultValue: true }),

  /**
   * Defines an array of directories where another plugin should be loaded from.
   * Should only be used in a development environment.
   */
  paths: schema.arrayOf(schema.string(), { defaultValue: [] }),
});

type PluginsConfigType = TypeOf<typeof pluginsSchema>;

/** @internal */
export class PluginsConfig {
  public static schema = pluginsSchema;

  /**
   * Indicates whether or not plugins should be initialized.
   */
  public readonly initialize: boolean;

  /**
   * Defines directories that we should scan for the plugin subdirectories.
   */
  public readonly pluginSearchPaths: ReadonlyArray<string>;

  /**
   * Defines directories where an additional plugin exists.
   */
  public readonly additionalPluginPaths: ReadonlyArray<string>;

  constructor(config: PluginsConfigType, env: Env) {
    this.initialize = config.initialize;
    this.pluginSearchPaths = env.pluginSearchPaths;
    // Only allow custom plugin paths in dev.
    this.additionalPluginPaths = env.mode.dev ? config.paths : [];
  }
}
