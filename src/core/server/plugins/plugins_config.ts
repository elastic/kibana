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

const pluginsSchema = schema.object({
  initialize: schema.boolean({ defaultValue: true }),
  scanDirs: schema.arrayOf(schema.string(), {
    defaultValue: [],
  }),
  paths: schema.arrayOf(schema.string(), {
    defaultValue: [],
  }),
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
  public readonly scanDirs: string[];

  /**
   * Defines direct paths to specific plugin directories that we should initialize.
   */
  public readonly paths: string[];

  constructor(config: PluginsConfigType) {
    this.initialize = config.initialize;
    this.scanDirs = config.scanDirs;
    this.paths = config.paths;
  }
}
