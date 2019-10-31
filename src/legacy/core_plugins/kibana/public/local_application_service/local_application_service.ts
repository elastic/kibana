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

import { App, AppUnmount } from 'kibana/public';
import { UIRoutes } from 'ui/routes';
import { ILocationService, IScope } from 'angular';
import { npStart } from 'ui/new_platform';
import { htmlIdGenerator } from '@elastic/eui';

interface ForwardDefinition {
  legacyAppId: string;
  newAppId: string;
  keepPrefix: boolean;
}

const matchAllWithPrefix = (prefixOrApp: string | App) =>
  `/${typeof prefixOrApp === 'string' ? prefixOrApp : prefixOrApp.id}/:tail*?`;

/**
 * To be able to migrate and shim parts of the Kibana app plugin
 * while still running some parts of it in the legacy world, this
 * service emulates the core application service while using the global
 * angular router to switch between apps without page reload.
 *
 * The id of the apps is used as prefix of the route - when switching between
 * to apps, the current application is unmounted.
 *
 * This service becomes unnecessary once the platform provides a central
 * router that handles switching between applications without page reload.
 */
export class LocalApplicationService {
  private apps: App[] = [];
  private forwards: ForwardDefinition[] = [];
  private idGenerator = htmlIdGenerator('kibanaAppLocalApp');

  /**
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
  register(app: App) {
    this.apps.push(app);
  }

  /**
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
  forwardApp(
    legacyAppId: string,
    newAppId: string,
    options: { keepPrefix: boolean } = { keepPrefix: false }
  ) {
    this.forwards.push({ legacyAppId, newAppId, ...options });
  }

  /**
   * Wires up listeners to handle mounting and unmounting of apps to
   * the legacy angular route manager. Once all apps within the Kibana
   * plugin are using the local route manager, this implementation can
   * be switched to a more lightweight implementation.
   *
   * @param angularRouteManager The current `ui/routes` instance
   */
  attachToAngular(angularRouteManager: UIRoutes) {
    this.apps.forEach(app => {
      const wrapperElementId = this.idGenerator();
      angularRouteManager.when(matchAllWithPrefix(app), {
        outerAngularWrapperRoute: true,
        reloadOnSearch: false,
        reloadOnUrl: false,
        template: `<div style="height:100%" id="${wrapperElementId}"></div>`,
        controller($scope: IScope) {
          const element = document.getElementById(wrapperElementId)!;
          let unmountHandler: AppUnmount | null = null;
          let isUnmounted = false;
          $scope.$on('$destroy', () => {
            if (unmountHandler) {
              unmountHandler();
            }
            isUnmounted = true;
          });
          (async () => {
            unmountHandler = await app.mount({ core: npStart.core }, { element, appBasePath: '' });
            // immediately unmount app if scope got destroyed in the meantime
            if (isUnmounted) {
              unmountHandler();
            }
          })();
        },
      });
    });

    this.forwards.forEach(({ legacyAppId, newAppId, keepPrefix }) => {
      angularRouteManager.when(matchAllWithPrefix(legacyAppId), {
        resolveRedirectTo: ($location: ILocationService) => {
          const url = $location.url();
          return `/${newAppId}${keepPrefix ? url : url.replace(legacyAppId, '')}`;
        },
      });
    });
  }
}

export const localApplicationService = new LocalApplicationService();
