/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { map, shareReplay } from 'rxjs/operators';
import { combineLatest } from 'rxjs';
import { PathConfigType, config as pathConfig } from '@kbn/utils';
import { pick, deepFreeze } from '@kbn/std';
import { CoreContext } from '../core_context';
import { PluginWrapper } from './plugin';
import { PluginsServiceSetupDeps, PluginsServiceStartDeps } from './plugins_service';
import {
  PluginInitializerContext,
  PluginManifest,
  PluginOpaqueId,
  SharedGlobalConfigKeys,
} from './types';
import { KibanaConfigType, config as kibanaConfig } from '../kibana_config';
import {
  ElasticsearchConfigType,
  config as elasticsearchConfig,
} from '../elasticsearch/elasticsearch_config';
import { SavedObjectsConfigType, savedObjectsConfig } from '../saved_objects/saved_objects_config';
import { CoreSetup, CoreStart } from '..';

export interface InstanceInfo {
  uuid: string;
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
  opaqueId: PluginOpaqueId,
  pluginManifest: PluginManifest,
  instanceInfo: InstanceInfo
): PluginInitializerContext {
  return {
    opaqueId,

    /**
     * Environment information that is safe to expose to plugins and may be beneficial for them.
     */
    env: {
      mode: coreContext.env.mode,
      packageInfo: coreContext.env.packageInfo,
      instanceUuid: instanceInfo.uuid,
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
        globalConfig$: combineLatest([
          coreContext.configService.atPath<KibanaConfigType>(kibanaConfig.path),
          coreContext.configService.atPath<ElasticsearchConfigType>(elasticsearchConfig.path),
          coreContext.configService.atPath<PathConfigType>(pathConfig.path),
          coreContext.configService.atPath<SavedObjectsConfigType>(savedObjectsConfig.path),
        ]).pipe(
          map(([kibana, elasticsearch, path, savedObjects]) =>
            deepFreeze({
              kibana: pick(kibana, SharedGlobalConfigKeys.kibana),
              elasticsearch: pick(elasticsearch, SharedGlobalConfigKeys.elasticsearch),
              path: pick(path, SharedGlobalConfigKeys.path),
              savedObjects: pick(savedObjects, SharedGlobalConfigKeys.savedObjects),
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
      registerOnPreRouting: deps.http.registerOnPreRouting,
      registerOnPreAuth: deps.http.registerOnPreAuth,
      registerAuth: deps.http.registerAuth,
      registerOnPostAuth: deps.http.registerOnPostAuth,
      registerOnPreResponse: deps.http.registerOnPreResponse,
      basePath: deps.http.basePath,
      auth: { get: deps.http.auth.get, isAuthenticated: deps.http.auth.isAuthenticated },
      csp: deps.http.csp,
      getServerInfo: deps.http.getServerInfo,
    },
    i18n: deps.i18n,
    logging: {
      configure: (config$) => deps.logging.configure(['plugins', plugin.name], config$),
    },
    metrics: {
      collectionInterval: deps.metrics.collectionInterval,
      getOpsMetrics$: deps.metrics.getOpsMetrics$,
    },
    savedObjects: {
      setClientFactoryProvider: deps.savedObjects.setClientFactoryProvider,
      addClientWrapper: deps.savedObjects.addClientWrapper,
      registerType: deps.savedObjects.registerType,
    },
    status: {
      core$: deps.status.core$,
      overall$: deps.status.overall$,
      set: deps.status.plugins.set.bind(null, plugin.name),
      dependencies$: deps.status.plugins.getDependenciesStatus$(plugin.name),
      derivedStatus$: deps.status.plugins.getDerivedStatus$(plugin.name),
      isStatusPageAnonymous: deps.status.isStatusPageAnonymous,
    },
    uiSettings: {
      register: deps.uiSettings.register,
    },
    getStartServices: () => plugin.startDependencies,
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
      client: deps.elasticsearch.client,
      createClient: deps.elasticsearch.createClient,
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
      createExporter: deps.savedObjects.createExporter,
      createImporter: deps.savedObjects.createImporter,
      getTypeRegistry: deps.savedObjects.getTypeRegistry,
    },
    metrics: {
      collectionInterval: deps.metrics.collectionInterval,
      getOpsMetrics$: deps.metrics.getOpsMetrics$,
    },
    uiSettings: {
      asScopedToClient: deps.uiSettings.asScopedToClient,
    },
    coreUsageData: deps.coreUsageData,
  };
}
