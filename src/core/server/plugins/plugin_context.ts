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

import { map, shareReplay } from 'rxjs/operators';
import { combineLatest } from 'rxjs';
import { CoreContext } from '../core_context';
import { PluginWrapper } from './plugin';
import { PluginsServiceSetupDeps, PluginsServiceStartDeps } from './plugins_service';
import {
  PluginInitializerContext,
  PluginManifest,
  PluginOpaqueId,
  SharedGlobalConfigKeys,
} from './types';
import { PathConfigType, config as pathConfig } from '../path';
import { KibanaConfigType, config as kibanaConfig } from '../kibana_config';
import {
  ElasticsearchConfigType,
  config as elasticsearchConfig,
} from '../elasticsearch/elasticsearch_config';
import { pick, deepFreeze } from '../../utils';
import { CoreSetup, CoreStart } from '..';

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
  opaqueId: PluginOpaqueId,
  pluginManifest: PluginManifest
): PluginInitializerContext {
  return {
    opaqueId,

    /**
     * Environment information that is safe to expose to plugins and may be beneficial for them.
     */
    env: {
      mode: coreContext.env.mode,
      packageInfo: coreContext.env.packageInfo,
    },

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
      legacy: {
        /**
         * Global configuration
         * Note: naming not final here, it will be renamed in a near future (https://github.com/elastic/kibana/issues/46240)
         * @deprecated
         */
        globalConfig$: combineLatest(
          coreContext.configService.atPath<KibanaConfigType>(kibanaConfig.path),
          coreContext.configService.atPath<ElasticsearchConfigType>(elasticsearchConfig.path),
          coreContext.configService.atPath<PathConfigType>(pathConfig.path)
        ).pipe(
          map(([kibana, elasticsearch, path]) =>
            deepFreeze({
              kibana: pick(kibana, SharedGlobalConfigKeys.kibana),
              elasticsearch: pick(elasticsearch, SharedGlobalConfigKeys.elasticsearch),
              path: pick(path, SharedGlobalConfigKeys.path),
            })
          )
        ),
      },

      /**
       * Reads the subset of the config at the `configPath` defined in the plugin
       * manifest and validates it against the schema in the static `schema` on
       * the given `ConfigClass`.
       * @param ConfigClass A class (not an instance of a class) that contains a
       * static `schema` that we validate the config at the given `path` against.
       */
      create<T>() {
        return coreContext.configService.atPath<T>(pluginManifest.configPath).pipe(shareReplay(1));
      },
      createIfExists() {
        return coreContext.configService.optionalAtPath(pluginManifest.configPath);
      },
    },
  };
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
): CoreSetup {
  const router = deps.http.createRouter('', plugin.opaqueId);

  return {
    capabilities: {
      registerProvider: deps.capabilities.registerProvider,
      registerSwitcher: deps.capabilities.registerSwitcher,
    },
    context: {
      createContextContainer: deps.context.createContextContainer,
    },
    elasticsearch: {
      legacy: deps.elasticsearch.legacy,
    },
    http: {
      createCookieSessionStorageFactory: deps.http.createCookieSessionStorageFactory,
      registerRouteHandlerContext: deps.http.registerRouteHandlerContext.bind(
        null,
        plugin.opaqueId
      ),
      createRouter: () => router,
      resources: deps.httpResources.createRegistrar(router),
      registerOnPreAuth: deps.http.registerOnPreAuth,
      registerAuth: deps.http.registerAuth,
      registerOnPostAuth: deps.http.registerOnPostAuth,
      registerOnPreResponse: deps.http.registerOnPreResponse,
      basePath: deps.http.basePath,
      auth: { get: deps.http.auth.get, isAuthenticated: deps.http.auth.isAuthenticated },
      csp: deps.http.csp,
      getServerInfo: deps.http.getServerInfo,
    },
    logging: {
      configure: (config$) => deps.logging.configure(['plugins', plugin.name], config$),
    },
    savedObjects: {
      setClientFactoryProvider: deps.savedObjects.setClientFactoryProvider,
      addClientWrapper: deps.savedObjects.addClientWrapper,
      registerType: deps.savedObjects.registerType,
      getImportExportObjectLimit: deps.savedObjects.getImportExportObjectLimit,
    },
    status: {
      core$: deps.status.core$,
    },
    uiSettings: {
      register: deps.uiSettings.register,
    },
    uuid: {
      getInstanceUuid: deps.uuid.getInstanceUuid,
    },
    getStartServices: () => plugin.startDependencies,
    auditTrail: deps.auditTrail,
  };
}

/**
 * This returns a facade for `CoreContext` that will be exposed to the plugin `start` method.
 * This facade should be safe to use only within `start` itself.
 *
 * This is called for each plugin when it starts, so each plugin gets its own
 * version of these values.
 *
 * @param coreContext Kibana core context
 * @param plugin The plugin we're building these values for.
 * @param deps Dependencies that Plugins services gets during start.
 * @internal
 */
export function createPluginStartContext<TPlugin, TPluginDependencies>(
  coreContext: CoreContext,
  deps: PluginsServiceStartDeps,
  plugin: PluginWrapper<TPlugin, TPluginDependencies>
): CoreStart {
  return {
    capabilities: {
      resolveCapabilities: deps.capabilities.resolveCapabilities,
    },
    elasticsearch: {
      legacy: deps.elasticsearch.legacy,
    },
    http: {
      auth: deps.http.auth,
      basePath: deps.http.basePath,
      getServerInfo: deps.http.getServerInfo,
    },
    savedObjects: {
      getScopedClient: deps.savedObjects.getScopedClient,
      createInternalRepository: deps.savedObjects.createInternalRepository,
      createScopedRepository: deps.savedObjects.createScopedRepository,
      createSerializer: deps.savedObjects.createSerializer,
      getTypeRegistry: deps.savedObjects.getTypeRegistry,
    },
    metrics: {
      getOpsMetrics$: deps.metrics.getOpsMetrics$,
    },
    uiSettings: {
      asScopedToClient: deps.uiSettings.asScopedToClient,
    },
    auditTrail: deps.auditTrail,
  };
}
