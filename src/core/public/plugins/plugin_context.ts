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
import { CoreContext } from '../core_system';
import { PluginWrapper } from './plugin';
import { PluginsServiceSetupDeps, PluginsServiceStartDeps } from './plugins_service';
import { CoreSetup, CoreStart } from '../';

/**
 * The available core services passed to a `PluginInitializer`
 *
 * @public
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PluginInitializerContext {}

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
): CoreSetup {
  return {
    http: deps.http,
    fatalErrors: deps.fatalErrors,
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
): CoreStart {
  return {
    application: {
      capabilities: deps.application.capabilities,
    },
    http: deps.http,
    chrome: deps.chrome,
    i18n: deps.i18n,
    notifications: deps.notifications,
    overlays: deps.overlays,
  };
}
