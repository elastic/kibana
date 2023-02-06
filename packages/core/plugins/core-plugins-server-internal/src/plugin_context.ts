/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { shareReplay } from 'rxjs/operators';
import type { CoreContext } from '@kbn/core-base-server-internal';
import type { PluginOpaqueId } from '@kbn/core-base-common';
import type { NodeInfo } from '@kbn/core-node-server';
import type { IRouter, IContextProvider } from '@kbn/core-http-server';
import { PluginInitializerContext, PluginManifest } from '@kbn/core-plugins-server';
import { CorePreboot, CoreSetup, CoreStart } from '@kbn/core-lifecycle-server';
import type { RequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import { PluginWrapper } from './plugin';
import {
  PluginsServicePrebootSetupDeps,
  PluginsServiceSetupDeps,
  PluginsServiceStartDeps,
} from './plugins_service';
import { getGlobalConfig, getGlobalConfig$ } from './legacy_config';

/** @internal */
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
 * @param opaqueId The opaque id created for this particular plugin.
 * @param manifest The manifest of the plugin we're building these values for.
 * @param instanceInfo Info about the instance Kibana is running on.
 * @param nodeInfo Info about how the Kibana process has been configured.
 *
 * @internal
 */
export function createPluginInitializerContext({
  coreContext,
  opaqueId,
  manifest,
  instanceInfo,
  nodeInfo,
}: {
  coreContext: CoreContext;
  opaqueId: PluginOpaqueId;
  manifest: PluginManifest;
  instanceInfo: InstanceInfo;
  nodeInfo: NodeInfo;
}): PluginInitializerContext {
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
     * Access the configuration for this particular Kibana node.
     * Can be used to determine which `roles` the current process was started with.
     */
    node: {
      roles: {
        backgroundTasks: nodeInfo.roles.backgroundTasks,
        ui: nodeInfo.roles.ui,
      },
    },

    /**
     * Plugin-scoped logger
     */
    logger: {
      get(...contextParts) {
        return coreContext.logger.get('plugins', manifest.id, ...contextParts);
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
        return coreContext.configService.atPath<T>(manifest.configPath).pipe(shareReplay(1));
      },
      get<T>() {
        return coreContext.configService.atPathSync<T>(manifest.configPath);
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
    customBranding: {
      register: (fetchFn) => {
        deps.customBranding.register(plugin.name, fetchFn);
      },
      getBrandingFor: deps.customBranding.getBrandingFor,
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
        ContextName extends keyof Omit<Context, 'resolve'>
      >(
        contextName: ContextName,
        provider: IContextProvider<Context, ContextName>
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
      setEncryptionExtension: deps.savedObjects.setEncryptionExtension,
      setSecurityExtension: deps.savedObjects.setSecurityExtension,
      setSpacesExtension: deps.savedObjects.setSpacesExtension,
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
      registerGlobal: deps.uiSettings.registerGlobal,
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
    customBranding: deps.customBranding,
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
      globalAsScopedToClient: deps.uiSettings.globalAsScopedToClient,
    },
    coreUsageData: deps.coreUsageData,
  };
}
