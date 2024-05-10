/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { omit } from 'lodash';
import type { CoreContext } from '@kbn/core-base-browser-internal';
import type { DiscoveredPlugin, PluginOpaqueId } from '@kbn/core-base-common';
import type { CoreSetup, CoreStart } from '@kbn/core-lifecycle-browser';
import type { PluginInitializerContext } from '@kbn/core-plugins-browser';
import type { PluginWrapper } from './plugin';
import type { PluginsServiceSetupDeps, PluginsServiceStartDeps } from './plugins_service';
import type { IRuntimePluginContractResolver } from './plugin_contract_resolver';

/**
 * Provides a plugin-specific context passed to the plugin's constructor. This is currently
 * empty but should provide static services in the future, such as config and logging.
 *
 * @param coreContext
 * @param opaqueId
 * @param pluginManifest
 * @param pluginConfig
 * @internal
 */
export function createPluginInitializerContext(
  coreContext: CoreContext,
  opaqueId: PluginOpaqueId,
  pluginManifest: DiscoveredPlugin,
  pluginConfig: {
    [key: string]: unknown;
  }
): PluginInitializerContext {
  return {
    opaqueId,
    env: coreContext.env,
    logger: {
      get(...contextParts) {
        return coreContext.logger.get('plugins', pluginManifest.id, ...contextParts);
      },
    },
    config: {
      get<T>() {
        return pluginConfig as unknown as T;
      },
    },
  };
}

/**
 * Provides a plugin-specific context passed to the plugin's `setup` lifecycle event. Currently
 * this returns a shallow copy the service setup contracts, but in the future could provide
 * plugin-scoped versions of the service.
 *
 * @param coreContext
 * @param deps
 * @param plugin
 * @internal
 */
export function createPluginSetupContext<
  TSetup,
  TStart,
  TPluginsSetup extends object,
  TPluginsStart extends object
>({
  deps,
  plugin,
  runtimeResolver,
}: {
  deps: PluginsServiceSetupDeps;
  plugin: PluginWrapper<TSetup, TStart, TPluginsSetup, TPluginsStart>;
  runtimeResolver: IRuntimePluginContractResolver;
}): CoreSetup {
  return {
    analytics: deps.analytics,
    application: {
      register: (app) => deps.application.register(plugin.opaqueId, app),
      registerAppUpdater: (statusUpdater$) => deps.application.registerAppUpdater(statusUpdater$),
    },
    customBranding: deps.customBranding,
    fatalErrors: deps.fatalErrors,
    executionContext: deps.executionContext,
    http: {
      ...deps.http,
      staticAssets: {
        getPluginAssetHref: (assetPath: string) =>
          deps.http.staticAssets.getPluginAssetHref(plugin.name, assetPath),
      },
    },
    notifications: deps.notifications,
    uiSettings: deps.uiSettings,
    settings: deps.settings,
    theme: deps.theme,
    security: {
      registerSecurityDelegate: (api) => deps.security.registerSecurityDelegate(api),
    },
    userProfile: {
      registerUserProfileDelegate: (delegate) =>
        deps.userProfile.registerUserProfileDelegate(delegate),
    },
    plugins: {
      onSetup: (...dependencyNames) => runtimeResolver.onSetup(plugin.name, dependencyNames),
      onStart: (...dependencyNames) => runtimeResolver.onStart(plugin.name, dependencyNames),
    },
    getStartServices: () => plugin.startDependencies,
  };
}

/**
 * Provides a plugin-specific context passed to the plugin's `start` lifecycle event. Currently
 * this returns a shallow copy the service start contracts, but in the future could provide
 * plugin-scoped versions of the service.
 *
 * @param coreContext
 * @param deps
 * @param plugin
 * @internal
 */
export function createPluginStartContext<
  TSetup,
  TStart,
  TPluginsSetup extends object,
  TPluginsStart extends object
>({
  deps,
  plugin,
  runtimeResolver,
}: {
  deps: PluginsServiceStartDeps;
  plugin: PluginWrapper<TSetup, TStart, TPluginsSetup, TPluginsStart>;
  runtimeResolver: IRuntimePluginContractResolver;
}): CoreStart {
  return {
    analytics: deps.analytics,
    application: {
      applications$: deps.application.applications$,
      currentAppId$: deps.application.currentAppId$,
      capabilities: deps.application.capabilities,
      navigateToApp: deps.application.navigateToApp,
      navigateToUrl: deps.application.navigateToUrl,
      getUrlForApp: deps.application.getUrlForApp,
      currentLocation$: deps.application.currentLocation$,
    },
    customBranding: deps.customBranding,
    docLinks: deps.docLinks,
    executionContext: deps.executionContext,
    http: {
      ...deps.http,
      staticAssets: {
        getPluginAssetHref: (assetPath: string) =>
          deps.http.staticAssets.getPluginAssetHref(plugin.name, assetPath),
      },
    },
    chrome: omit(deps.chrome, 'getComponent'),
    i18n: deps.i18n,
    notifications: deps.notifications,
    overlays: deps.overlays,
    uiSettings: deps.uiSettings,
    settings: deps.settings,
    savedObjects: deps.savedObjects,
    fatalErrors: deps.fatalErrors,
    deprecations: deps.deprecations,
    theme: deps.theme,
    security: {
      authc: deps.security.authc,
    },
    userProfile: deps.userProfile,
    plugins: {
      onStart: (...dependencyNames) => runtimeResolver.onStart(plugin.name, dependencyNames),
    },
  };
}
