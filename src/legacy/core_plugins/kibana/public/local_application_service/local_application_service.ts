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
import { UIRoutes } from 'ui/routes';
import { IScope } from 'angular';
import { npStart } from 'ui/new_platform';
import { htmlIdGenerator } from '@elastic/eui';

/**
 * To be able to migrate and shim parts of the Kibana app plugin
 * while still running some parts of it in the legacy world, this
 * service emulates the core application service while using the global
 * angular router to switch between apps without page reload.
 *
 * The id of the apps is used as prefix of the route - when switching between
 * to apps, the current application is torn down.
 *
 * This service becomes unnecessary once the platform provides a central
 * router that handles switching between applications without page reload.
 */
export class LocalApplicationService {
  private apps: App[] = [];
  private idGenerator = htmlIdGenerator('kibanaAppLocalApp');

  register(app: App) {
    this.apps.push(app);
  }

  registerWithAngularRouter(angularRouteManager: UIRoutes) {
    this.apps.forEach(app => {
      const wrapperElementId = this.idGenerator();
      angularRouteManager.when(`/${app.id}/:tail*?`, {
        outerAngularWrapperRoute: true,
        reloadOnSearch: false,
        reloadOnUrl: false,
        template: `<div style="height:100%" id="${wrapperElementId}"></div>`,
        controller($scope: IScope) {
          const element = document.getElementById(wrapperElementId)!;
          (async () => {
            const onUnmount = await app.mount({ core: npStart.core }, { element, appBasePath: '' });
            $scope.$on('$destroy', () => {
              onUnmount();
            });
          })();
        },
      });
    });
  }
}

export const localApplicationService = new LocalApplicationService();
