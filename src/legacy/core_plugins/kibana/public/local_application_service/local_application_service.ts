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

import { App, AppUnmount, AppMountDeprecated } from 'kibana/public';
import { UIRoutes } from 'ui/routes';
import { ILocationService, IScope } from 'angular';
import { npStart } from 'ui/new_platform';
import { htmlIdGenerator } from '@elastic/eui';

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
  private idGenerator = htmlIdGenerator('kibanaAppLocalApp');

  /**
   * Wires up listeners to handle mounting and unmounting of apps to
   * the legacy angular route manager. Once all apps within the Kibana
   * plugin are using the local route manager, this implementation can
   * be switched to a more lightweight implementation.
   *
   * @param angularRouteManager The current `ui/routes` instance
   */
  attachToAngular(angularRouteManager: UIRoutes) {
    npStart.plugins.kibana_legacy.getApps().forEach(app => {
      const wrapperElementId = this.idGenerator();
      angularRouteManager.when(matchAllWithPrefix(app), {
        outerAngularWrapperRoute: true,
        reloadOnSearch: false,
        reloadOnUrl: false,
        template: `<div class="kbnLocalApplicationWrapper" id="${wrapperElementId}"></div>`,
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
            const params = { element, appBasePath: '', onAppLeave: () => undefined };
            unmountHandler = isAppMountDeprecated(app.mount)
              ? await app.mount({ core: npStart.core }, params)
              : await app.mount(params);
            // immediately unmount app if scope got destroyed in the meantime
            if (isUnmounted) {
              unmountHandler();
            }
          })();
        },
      });
    });

    npStart.plugins.kibana_legacy.getForwards().forEach(({ legacyAppId, newAppId, keepPrefix }) => {
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

function isAppMountDeprecated(mount: (...args: any[]) => any): mount is AppMountDeprecated {
  // Mount functions with two arguments are assumed to expect deprecated `context` object.
  return mount.length === 2;
}
