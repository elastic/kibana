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

import { DiscoveredPlugin } from '../../server';
import { BasePathSetup, BasePathStart } from '../base_path';
import { ChromeSetup } from '../chrome';
import { CoreContext } from '../core_system';
import { FatalErrorsSetup } from '../fatal_errors';
import { I18nSetup, I18nStart } from '../i18n';
import { NotificationsSetup, NotificationsStart } from '../notifications';
import { UiSettingsSetup } from '../ui_settings';
import { PluginWrapper } from './plugin';
import { PluginsServiceSetupDeps, PluginsServiceStartDeps } from './plugins_service';
import { OverlayStart } from '../overlays';
import { ApplicationStart } from '../application';
import { HttpSetup, HttpStart } from '../http';

/**
 * The available core services passed to a `PluginInitializer`
 *
 * @public
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PluginInitializerContext {}

/**
 * The available core services passed to a plugin's `Plugin#setup` method.
 *
 * @public
 */
export interface PluginSetupContext {
  basePath: BasePathSetup;
  chrome: ChromeSetup;
  fatalErrors: FatalErrorsSetup;
  http: HttpSetup;
  i18n: I18nSetup;
  notifications: NotificationsSetup;
  uiSettings: UiSettingsSetup;
}

/**
 * The available core services passed to a plugin's `Plugin#start` method.
 *
 * @public
 */
export interface PluginStartContext {
  application: Pick<ApplicationStart, 'capabilities'>;
  basePath: BasePathStart;
  http: HttpStart;
  i18n: I18nStart;
  notifications: NotificationsStart;
  overlays: OverlayStart;
}

/**
 * Provides a plugin-specific context passed to the plugin's construtor. This is currently
 * empty but should provide static services in the future, such as config and logging.
 *
 * @param coreContext
 * @param pluginManinfest
 * @internal
 */
export function createPluginInitializerContext(
  coreContext: CoreContext,
  pluginManifest: DiscoveredPlugin
): PluginInitializerContext {
  return {};
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
export function createPluginSetupContext<TSetup, TStart, TPluginsSetup, TPluginsStart>(
  coreContext: CoreContext,
  deps: PluginsServiceSetupDeps,
  plugin: PluginWrapper<TSetup, TStart, TPluginsSetup, TPluginsStart>
): PluginSetupContext {
  return {
    http: deps.http,
    basePath: deps.basePath,
    chrome: deps.chrome,
    fatalErrors: deps.fatalErrors,
    i18n: deps.i18n,
    notifications: deps.notifications,
    uiSettings: deps.uiSettings,
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
export function createPluginStartContext<TSetup, TStart, TPluginsSetup, TPluginsStart>(
  coreContext: CoreContext,
  deps: PluginsServiceStartDeps,
  plugin: PluginWrapper<TSetup, TStart, TPluginsSetup, TPluginsStart>
): PluginStartContext {
  return {
    application: {
      capabilities: deps.application.capabilities,
    },
    basePath: deps.basePath,
    http: deps.http,
    i18n: deps.i18n,
    notifications: deps.notifications,
    overlays: deps.overlays,
  };
}
