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
import { ConfigWithSchema, EnvironmentMode } from '../config';
import { CoreContext } from '../core_context';
import { ClusterClient } from '../elasticsearch';
import { HttpServiceSetup } from '../http';
import { LoggerFactory } from '../logging';
import { PluginWrapper, PluginManifest } from './plugin';
import { PluginsServiceSetupDeps } from './plugins_service';

/**
 * Context that's available to plugins during initialization stage.
 *
 * @public
 */
export interface PluginInitializerContext {
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
 * Context passed to the plugins `setup` method.
 *
 * @public
 */
export interface PluginSetupContext {
  elasticsearch: {
    adminClient$: Observable<ClusterClient>;
    dataClient$: Observable<ClusterClient>;
  };
  http: {
    registerAuth: HttpServiceSetup['registerAuth'];
    registerOnRequest: HttpServiceSetup['registerOnRequest'];
  };
}

/**
 * This returns a facade for `CoreContext` that will be exposed to the plugin initializer.
 * This facade should be safe to use across entire plugin lifespan.
 *
 * This is called for each plugin when it's created, so each plugin gets its own
 * version of these values.
 *
 * We should aim to be restrictive and specific in the APIs that we expose.
 *
 * @param coreContext Kibana core context
 * @param pluginManifest The manifest of the plugin we're building these values for.
 * @internal
 */
export function createPluginInitializerContext(
  coreContext: CoreContext,
  pluginManifest: PluginManifest
): PluginInitializerContext {
  return {
    /**
     * Environment information that is safe to expose to plugins and may be beneficial for them.
     */
    env: { mode: coreContext.env.mode },

    /**
     * Plugin-scoped logger
     */
    logger: {
      get(...contextParts) {
        return coreContext.logger.get('plugins', pluginManifest.id, ...contextParts);
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
        return coreContext.configService.atPath(pluginManifest.configPath, ConfigClass);
      },
      createIfExists(ConfigClass) {
        return coreContext.configService.optionalAtPath(pluginManifest.configPath, ConfigClass);
      },
    },
  };
}

// Added to improve http typings as make { http: Required<HttpSetup> }
// Http service is disabled, when Kibana runs in optimizer mode or as dev cluster managed by cluster master.
// In theory no plugins shouldn try to access http dependency in this case.
function preventAccess() {
  throw new Error('Cannot use http contract when http server not started');
}
/**
 * This returns a facade for `CoreContext` that will be exposed to the plugin `setup` method.
 * This facade should be safe to use only within `setup` itself.
 *
 * This is called for each plugin when it's set up, so each plugin gets its own
 * version of these values.
 *
 * We should aim to be restrictive and specific in the APIs that we expose.
 *
 * @param coreContext Kibana core context
 * @param plugin The plugin we're building these values for.
 * @param deps Dependencies that Plugins services gets during setup.
 * @internal
 */
export function createPluginSetupContext<TPlugin, TPluginDependencies>(
  coreContext: CoreContext,
  deps: PluginsServiceSetupDeps,
  plugin: PluginWrapper<TPlugin, TPluginDependencies>
): PluginSetupContext {
  return {
    elasticsearch: {
      adminClient$: deps.elasticsearch.adminClient$,
      dataClient$: deps.elasticsearch.dataClient$,
    },
    http: deps.http
      ? {
          registerAuth: deps.http.registerAuth,
          registerOnRequest: deps.http.registerOnRequest,
        }
      : {
          registerAuth: preventAccess,
          registerOnRequest: preventAccess,
        },
  };
}
