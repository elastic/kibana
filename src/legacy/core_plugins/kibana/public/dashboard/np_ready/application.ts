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

import { EuiIcon } from '@elastic/eui';
import angular, { IModule } from 'angular';
import { i18nDirective, i18nFilter, I18nProvider } from '@kbn/i18n/angular';
import {
  AppMountContext,
  ChromeStart,
  IUiSettingsClient,
  CoreStart,
  SavedObjectsClientContract,
  PluginInitializerContext,
} from 'kibana/public';
import { Storage } from '../../../../../../plugins/kibana_utils/public';
import {
  configureAppAngularModule,
  createTopNavDirective,
  createTopNavHelper,
  IPrivate,
  KbnUrlProvider,
  PrivateProvider,
  PromiseServiceCreator,
  RedirectWhenMissingProvider,
  SavedObjectLoader,
} from '../legacy_imports';
// @ts-ignore
import { initDashboardApp } from './legacy_app';
import { IEmbeddableStart } from '../../../../../../plugins/embeddable/public';
import { NavigationPublicPluginStart as NavigationStart } from '../../../../../../plugins/navigation/public';
import { DataPublicPluginStart } from '../../../../../../plugins/data/public';
import { SharePluginStart } from '../../../../../../plugins/share/public';
import { KibanaLegacyStart } from '../../../../../../plugins/kibana_legacy/public';

export interface RenderDeps {
  pluginInitializerContext: PluginInitializerContext;
  core: CoreStart;
  data: DataPublicPluginStart;
  navigation: NavigationStart;
  savedObjectsClient: SavedObjectsClientContract;
  savedDashboards: SavedObjectLoader;
  dashboardConfig: KibanaLegacyStart['dashboardConfig'];
  dashboardCapabilities: any;
  uiSettings: IUiSettingsClient;
  chrome: ChromeStart;
  addBasePath: (path: string) => string;
  savedQueryService: DataPublicPluginStart['query']['savedQueries'];
  embeddable: IEmbeddableStart;
  localStorage: Storage;
  share: SharePluginStart;
  config: KibanaLegacyStart['config'];
}

let angularModuleInstance: IModule | null = null;

export const renderApp = (element: HTMLElement, appBasePath: string, deps: RenderDeps) => {
  if (!angularModuleInstance) {
    angularModuleInstance = createLocalAngularModule(deps.core, deps.navigation);
    // global routing stuff
    configureAppAngularModule(
      angularModuleInstance,
      { core: deps.core, env: deps.pluginInitializerContext.env },
      true
    );
    initDashboardApp(angularModuleInstance, deps);
  }

  const $injector = mountDashboardApp(appBasePath, element);

  return () => {
    $injector.get('$rootScope').$destroy();
  };
};

const mainTemplate = (basePath: string) => `<div ng-view class="kbnLocalApplicationWrapper">
  <base href="${basePath}" />
</div>`;

const moduleName = 'app/dashboard';

const thirdPartyAngularDependencies = ['ngSanitize', 'ngRoute', 'react'];

function mountDashboardApp(appBasePath: string, element: HTMLElement) {
  const mountpoint = document.createElement('div');
  mountpoint.setAttribute('class', 'kbnLocalApplicationWrapper');
  // eslint-disable-next-line
  mountpoint.innerHTML = mainTemplate(appBasePath);
  // bootstrap angular into detached element and attach it later to
  // make angular-within-angular possible
  const $injector = angular.bootstrap(mountpoint, [moduleName]);
  // initialize global state handler
  element.appendChild(mountpoint);
  return $injector;
}

function createLocalAngularModule(core: AppMountContext['core'], navigation: NavigationStart) {
  createLocalI18nModule();
  createLocalPrivateModule();
  createLocalPromiseModule();
  createLocalConfigModule(core);
  createLocalKbnUrlModule();
  createLocalTopNavModule(navigation);
  createLocalIconModule();

  const dashboardAngularModule = angular.module(moduleName, [
    ...thirdPartyAngularDependencies,
    'app/dashboard/Config',
    'app/dashboard/I18n',
    'app/dashboard/Private',
    'app/dashboard/TopNav',
    'app/dashboard/KbnUrl',
    'app/dashboard/Promise',
    'app/dashboard/icon',
  ]);
  return dashboardAngularModule;
}

function createLocalIconModule() {
  angular
    .module('app/dashboard/icon', ['react'])
    .directive('icon', reactDirective => reactDirective(EuiIcon));
}

function createLocalKbnUrlModule() {
  angular
    .module('app/dashboard/KbnUrl', ['app/dashboard/Private', 'ngRoute'])
    .service('kbnUrl', (Private: IPrivate) => Private(KbnUrlProvider))
    .service('redirectWhenMissing', (Private: IPrivate) => Private(RedirectWhenMissingProvider));
}

function createLocalConfigModule(core: AppMountContext['core']) {
  angular.module('app/dashboard/Config', ['app/dashboard/Private']).provider('config', () => {
    return {
      $get: () => ({
        get: core.uiSettings.get.bind(core.uiSettings),
      }),
    };
  });
}

function createLocalPromiseModule() {
  angular.module('app/dashboard/Promise', []).service('Promise', PromiseServiceCreator);
}

function createLocalPrivateModule() {
  angular.module('app/dashboard/Private', []).provider('Private', PrivateProvider);
}

function createLocalTopNavModule(navigation: NavigationStart) {
  angular
    .module('app/dashboard/TopNav', ['react'])
    .directive('kbnTopNav', createTopNavDirective)
    .directive('kbnTopNavHelper', createTopNavHelper(navigation.ui));
}

function createLocalI18nModule() {
  angular
    .module('app/dashboard/I18n', [])
    .provider('i18n', I18nProvider)
    .filter('i18n', i18nFilter)
    .directive('i18nId', i18nDirective);
}
