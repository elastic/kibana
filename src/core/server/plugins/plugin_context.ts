/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { shareReplay } from 'rxjs/operators';
import type { RequestHandlerContext } from 'src/core/server';
import { CoreContext } from '../core_context';
import { PluginWrapper } from './plugin';
import {
  PluginsServicePrebootSetupDeps,
  PluginsServiceSetupDeps,
  PluginsServiceStartDeps,
} from './plugins_service';
import { PluginInitializerContext, PluginManifest, PluginOpaqueId } from './types';
import { IRouter, RequestHandlerContextProvider } from '../http';
import { getGlobalConfig, getGlobalConfig$ } from './legacy_config';
import { CorePreboot, CoreSetup, CoreStart } from '..';

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
      configs: coreContext.env.configs,
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
        globalConfig$: getGlobalConfig$(coreContext.configService),
        get: () => getGlobalConfig(coreContext.configService),
      },

      /**
       * Reads the subset of the config at the `configPath` defined in the plugin
       * manifest.
       */
      create<T>() {
        return coreContext.configService.atPath<T>(pluginManifest.configPath).pipe(shareReplay(1));
      },
      get<T>() {
        return coreContext.configService.atPathSync<T>(pluginManifest.configPath);
      },
    },
  };
}

/**
 * Provides `CorePreboot` contract that will be exposed to the `preboot` plugin `setup` method.
 * This contract should be safe to use only within `setup` itself.
 *
 * This is called for each `preboot` plugin when it's set up, so each plugin gets its own
 * version of these values.
 *
 * We should aim to be restrictive and specific in the APIs that we expose.
 *
 * @param coreContext Kibana core context
 * @param deps Dependencies that Plugins services gets during setup.
 * @param plugin The plugin we're building these values for.
 * @internal
 */
export function createPluginPrebootSetupContext(
  coreContext: CoreContext,
  deps: PluginsServicePrebootSetupDeps,
  plugin: PluginWrapper
): CorePreboot {
  return {
    analytics: {
      optIn: deps.analytics.optIn,
      registerContextProvider: deps.analytics.registerContextProvider,
      removeContextProvider: deps.analytics.removeContextProvider,
      registerEventType: deps.analytics.registerEventType,
      registerShipper: deps.analytics.registerShipper,
      reportEvent: deps.analytics.reportEvent,
      telemetryCounter$: deps.analytics.telemetryCounter$,
    },
    elasticsearch: {
      config: deps.elasticsearch.config,
      createClient: deps.elasticsearch.createClient,
    },
    http: {
      registerRoutes: deps.http.registerRoutes,
      basePath: deps.http.basePath,
      getServerInfo: deps.http.getServerInfo,
    },
    preboot: {
      isSetupOnHold: deps.preboot.isSetupOnHold,
      holdSetupUntilResolved: (reason, promise) =>
        deps.preboot.holdSetupUntilResolved(plugin.name, reason, promise),
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
    analytics: {
      optIn: deps.analytics.optIn,
      registerContextProvider: deps.analytics.registerContextProvider,
      removeContextProvider: deps.analytics.removeContextProvider,
      registerEventType: deps.analytics.registerEventType,
      registerShipper: deps.analytics.registerShipper,
      reportEvent: deps.analytics.reportEvent,
      telemetryCounter$: deps.analytics.telemetryCounter$,
    },
    capabilities: {
      registerProvider: deps.capabilities.registerProvider,
      registerSwitcher: deps.capabilities.registerSwitcher,
    },
    context: {
      createContextContainer: deps.context.createContextContainer,
    },
    docLinks: deps.docLinks,
    elasticsearch: {
      legacy: deps.elasticsearch.legacy,
      setUnauthorizedErrorHandler: deps.elasticsearch.setUnauthorizedErrorHandler,
    },
    executionContext: {
      withContext: deps.executionContext.withContext,
      getAsLabels: deps.executionContext.getAsLabels,
    },
    http: {
      createCookieSessionStorageFactory: deps.http.createCookieSessionStorageFactory,
      registerRouteHandlerContext: <
        Context extends RequestHandlerContext,
        ContextName extends keyof Context
      >(
        contextName: ContextName,
        provider: RequestHandlerContextProvider<Context, ContextName>
      ) => deps.http.registerRouteHandlerContext(plugin.opaqueId, contextName, provider),
      createRouter: <Context extends RequestHandlerContext = RequestHandlerContext>() =>
        router as IRouter<Context>,
      resources: deps.httpResources.createRegistrar(router),
      registerOnPreRouting: deps.http.registerOnPreRouting,
      registerOnPreAuth: deps.http.registerOnPreAuth,
      registerAuth: deps.http.registerAuth,
      registerOnPostAuth: deps.http.registerOnPostAuth,
      registerOnPreResponse: deps.http.registerOnPreResponse,
      basePath: deps.http.basePath,
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
      getKibanaIndex: deps.savedObjects.getKibanaIndex,
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
    deprecations: deps.deprecations.getRegistry(plugin.name),
    coreUsageData: {
      registerUsageCounter: deps.coreUsageData.registerUsageCounter,
    },
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
    analytics: {
      optIn: deps.analytics.optIn,
      reportEvent: deps.analytics.reportEvent,
      telemetryCounter$: deps.analytics.telemetryCounter$,
    },
    capabilities: {
      resolveCapabilities: deps.capabilities.resolveCapabilities,
    },
    docLinks: deps.docLinks,
    elasticsearch: {
      client: deps.elasticsearch.client,
      createClient: deps.elasticsearch.createClient,
    },
    executionContext: deps.executionContext,
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
