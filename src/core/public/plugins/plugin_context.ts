/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { omit } from 'lodash';
import { DiscoveredPlugin } from '../../server';
import { PluginOpaqueId, PackageInfo, EnvironmentMode } from '../../server/types';
import { CoreContext } from '../core_system';
import { PluginWrapper } from './plugin';
import { PluginsServiceSetupDeps, PluginsServiceStartDeps } from './plugins_service';
import { CoreSetup, CoreStart } from '../';

/**
 * The available core services passed to a `PluginInitializer`
 *
 * @public
 */
export interface PluginInitializerContext<ConfigSchema extends object = object> {
  /**
   * A symbol used to identify this plugin in the system. Needed when registering handlers or context providers.
   */
  readonly opaqueId: PluginOpaqueId;
  readonly env: {
    mode: Readonly<EnvironmentMode>;
    packageInfo: Readonly<PackageInfo>;
  };
  readonly config: {
    get: <T extends object = ConfigSchema>() => T;
  };
}

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
>(
  coreContext: CoreContext,
  deps: PluginsServiceSetupDeps,
  plugin: PluginWrapper<TSetup, TStart, TPluginsSetup, TPluginsStart>
): CoreSetup {
  return {
    analytics: deps.analytics,
    application: {
      register: (app) => deps.application.register(plugin.opaqueId, app),
      registerAppUpdater: (statusUpdater$) => deps.application.registerAppUpdater(statusUpdater$),
    },
    fatalErrors: deps.fatalErrors,
    executionContext: deps.executionContext,
    http: deps.http,
    notifications: deps.notifications,
    uiSettings: deps.uiSettings,
    injectedMetadata: {
      getInjectedVar: deps.injectedMetadata.getInjectedVar,
    },
    theme: deps.theme,
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
>(
  coreContext: CoreContext,
  deps: PluginsServiceStartDeps,
  plugin: PluginWrapper<TSetup, TStart, TPluginsSetup, TPluginsStart>
): CoreStart {
  return {
    analytics: deps.analytics,
    application: {
      applications$: deps.application.applications$,
      currentAppId$: deps.application.currentAppId$,
      capabilities: deps.application.capabilities,
      navigateToApp: deps.application.navigateToApp,
      navigateToUrl: deps.application.navigateToUrl,
      getUrlForApp: deps.application.getUrlForApp,
    },
    docLinks: deps.docLinks,
    executionContext: deps.executionContext,
    http: deps.http,
    chrome: omit(deps.chrome, 'getComponent'),
    i18n: deps.i18n,
    notifications: deps.notifications,
    overlays: deps.overlays,
    uiSettings: deps.uiSettings,
    savedObjects: deps.savedObjects,
    injectedMetadata: {
      getInjectedVar: deps.injectedMetadata.getInjectedVar,
    },
    fatalErrors: deps.fatalErrors,
    deprecations: deps.deprecations,
    theme: deps.theme,
  };
}
