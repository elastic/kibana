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

import { Type } from '@kbn/config-schema';
import { Observable } from 'rxjs';
import { KibanaCore } from '../../types';
import { ConfigWithSchema, EnvironmentMode } from '../config';
import { LoggerFactory } from '../logging';
import { Plugin } from './plugin';

export interface PluginsCore {
  env: { mode: EnvironmentMode };
  logger: LoggerFactory;
  config: {
    create: <Schema extends Type<any>, Config>(
      ConfigClass: ConfigWithSchema<Schema, Config>
    ) => Observable<Config>;
    createIfExists: <Schema extends Type<any>, Config>(
      ConfigClass: ConfigWithSchema<Schema, Config>
    ) => Observable<Config | undefined>;
  };
}

/**
 * This returns a facade for `KibanaCore` that will be exposed to the plugins.
 *
 * This is called for each plugin when it's created, so each plugin gets its own
 * version of these values.
 *
 * We should aim to be restrictive and specific in the APIs that we expose.
 *
 * @param plugin The plugin we're building these values for.
 * @param core The core Kibana features
 * @internal
 */
export function createPluginsCore(plugin: Plugin, core: KibanaCore): PluginsCore {
  return {
    /**
     * Environment information that is safe to expose to plugins and may be beneficial for them.
     */
    env: { mode: core.env.mode },

    /**
     * Plugin-scoped logger
     */
    logger: {
      get(...contextParts) {
        return core.logger.get('plugins', plugin.name, ...contextParts);
      },
    },

    /**
     * Core configuration functionality, enables fetching a subset of the config.
     */
    config: {
      /**
       * Reads the subset of the config at the `configPath` defined in the plugin
       * manifest and validates it against the schema in the static `schema` on
       * the given `ConfigClass`.
       * @param ConfigClass A class (not an instance of a class) that contains a
       * static `schema` that we validate the config at the given `path` against.
       */
      create(ConfigClass) {
        return core.configService.atPath(plugin.configPath, ConfigClass);
      },
      createIfExists(ConfigClass) {
        return core.configService.optionalAtPath(plugin.configPath, ConfigClass);
      },
    },
  };
}
