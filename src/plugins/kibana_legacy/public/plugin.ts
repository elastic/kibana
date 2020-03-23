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

import {
  App,
  AppBase,
  PluginInitializerContext,
  AppUpdatableFields,
  CoreStart,
} from 'kibana/public';
import { Observable } from 'rxjs';
import { ConfigSchema } from '../config';
import { getDashboardConfig } from './dashboard_config';

interface ForwardDefinition {
  legacyAppId: string;
  newAppId: string;
  keepPrefix: boolean;
}

export type AngularRenderedAppUpdater = (
  app: AppBase
) => Partial<AppUpdatableFields & { activeUrl: string }> | undefined;

export interface AngularRenderedApp extends App {
  /**
   * Angular rendered apps are able to update the active url in the nav link (which is currently not
   * possible for actual NP apps). When regular applications have the same functionality, this type
   * override can be removed.
   */
  updater$?: Observable<AngularRenderedAppUpdater>;
  /**
   * If the active url is updated via the updater$ subject, the app id is assumed to be identical with
   * the nav link id. If this is not the case, it is possible to provide another nav link id here.
   */
  navLinkId?: string;
}

export class KibanaLegacyPlugin {
  private apps: AngularRenderedApp[] = [];
  private forwards: ForwardDefinition[] = [];

  constructor(private readonly initializerContext: PluginInitializerContext<ConfigSchema>) {}

  public setup() {
    return {
      /**
       * @deprecated
       * Register an app to be managed by the application service.
       * This method works exactly as `core.application.register`.
       *
       * When an app is mounted, it is responsible for routing. The app
       * won't be mounted again if the route changes within the prefix
       * of the app (its id). It is fine to use whatever means for handling
       * routing within the app.
       *
       * When switching to a URL outside of the current prefix, the app router
       * shouldn't do anything because it doesn't own the routing anymore -
       * the local application service takes over routing again,
       * unmounts the current app and mounts the next app.
       *
       * @param app The app descriptor
       */
      registerLegacyApp: (app: AngularRenderedApp) => {
        this.apps.push(app);
      },

      /**
       * @deprecated
       * Forwards every URL starting with `legacyAppId` to the same URL starting
       * with `newAppId` - e.g. `/legacy/my/legacy/path?q=123` gets forwarded to
       * `/newApp/my/legacy/path?q=123`.
       *
       * When setting the `keepPrefix` option, the new app id is simply prepended.
       * The example above would become `/newApp/legacy/my/legacy/path?q=123`.
       *
       * This method can be used to provide backwards compatibility for URLs when
       * renaming or nesting plugins. For route changes after the prefix, please
       * use the routing mechanism of your app.
       *
       * @param legacyAppId The name of the old app to forward URLs from
       * @param newAppId The name of the new app that handles the URLs now
       * @param options Whether the prefix of the old app is kept to nest the legacy
       * path into the new path
       */
      forwardApp: (
        legacyAppId: string,
        newAppId: string,
        options: { keepPrefix: boolean } = { keepPrefix: false }
      ) => {
        this.forwards.push({ legacyAppId, newAppId, ...options });
      },

      /**
       * @deprecated
       * The `defaultAppId` config key is temporarily exposed to be used in the legacy platform.
       * As this setting is going away, no new code should depend on it.
       */
      config: this.initializerContext.config.get(),
      /**
       * @deprecated
       * Temporarily exposing the NP env to simulate initializer contexts in the LP.
       */
      env: this.initializerContext.env,
    };
  }

  public start({ application }: CoreStart) {
    return {
      /**
       * @deprecated
       * Just exported for wiring up with legacy platform, should not be used.
       */
      getApps: () => this.apps,
      /**
       * @deprecated
       * Just exported for wiring up with legacy platform, should not be used.
       */
      getForwards: () => this.forwards,
      config: this.initializerContext.config.get(),
      dashboardConfig: getDashboardConfig(!application.capabilities.dashboard.showWriteControls),
    };
  }
}

export type KibanaLegacySetup = ReturnType<KibanaLegacyPlugin['setup']>;
export type KibanaLegacyStart = ReturnType<KibanaLegacyPlugin['start']>;
