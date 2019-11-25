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

import { App } from 'kibana/public';

interface ForwardDefinition {
  legacyAppId: string;
  newAppId: string;
  keepPrefix: boolean;
}

export class KibanaLegacyPlugin {
  private apps: App[] = [];
  private forwards: ForwardDefinition[] = [];

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
      registerLegacyApp: (app: App) => {
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
    };
  }

  public start() {
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
    };
  }
}

export type KibanaLegacySetup = ReturnType<KibanaLegacyPlugin['setup']>;
export type KibanaLegacyStart = ReturnType<KibanaLegacyPlugin['start']>;
