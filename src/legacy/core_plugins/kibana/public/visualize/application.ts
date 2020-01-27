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

import angular, { IModule } from 'angular';
import { EuiConfirmModal } from '@elastic/eui';
import { i18nDirective, i18nFilter, I18nProvider } from '@kbn/i18n/angular';

import { AppMountContext, LegacyCoreStart } from 'kibana/public';
import {
  AppStateProvider,
  AppState,
  configureAppAngularModule,
  confirmModalFactory,
  createTopNavDirective,
  createTopNavHelper,
  EventsProvider,
  GlobalStateProvider,
  KbnUrlProvider,
  RedirectWhenMissingProvider,
  IPrivate,
  PersistedState,
  PrivateProvider,
  PromiseServiceCreator,
  StateManagementConfigProvider,
} from './legacy_imports';
import { NavigationPublicPluginStart as NavigationStart } from '../../../../../plugins/navigation/public';

// @ts-ignore
import { initVisualizeApp } from './legacy_app';
import { VisualizeKibanaServices } from './kibana_services';

let angularModuleInstance: IModule | null = null;

export const renderApp = async (
  element: HTMLElement,
  appBasePath: string,
  deps: VisualizeKibanaServices
) => {
  if (!angularModuleInstance) {
    angularModuleInstance = createLocalAngularModule(deps.core, deps.navigation);
    // global routing stuff
    configureAppAngularModule(angularModuleInstance, deps.core as LegacyCoreStart, true);
    // custom routing stuff
    initVisualizeApp(angularModuleInstance, deps);
  }
  const $injector = mountVisualizeApp(appBasePath, element);
  return () => $injector.get('$rootScope').$destroy();
};

const mainTemplate = (basePath: string) => `<div style="height: 100%">
  <base href="${basePath}" />
  <div ng-view style="height: 100%;"></div>
</div>
`;

const moduleName = 'app/visualize';

const thirdPartyAngularDependencies = ['ngSanitize', 'ngRoute', 'react'];

function mountVisualizeApp(appBasePath: string, element: HTMLElement) {
  const mountpoint = document.createElement('div');
  mountpoint.setAttribute('style', 'height: 100%');
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
  createLocalStateModule();
  createLocalPersistedStateModule();
  createLocalTopNavModule(navigation);
  createLocalConfirmModalModule();

  const visualizeAngularModule: IModule = angular.module(moduleName, [
    ...thirdPartyAngularDependencies,
    'app/visualize/Config',
    'app/visualize/I18n',
    'app/visualize/Private',
    'app/visualize/PersistedState',
    'app/visualize/TopNav',
    'app/visualize/State',
    'app/visualize/ConfirmModal',
  ]);
  return visualizeAngularModule;
}

function createLocalConfirmModalModule() {
  angular
    .module('app/visualize/ConfirmModal', ['react'])
    .factory('confirmModal', confirmModalFactory)
    .directive('confirmModal', reactDirective => reactDirective(EuiConfirmModal));
}

function createLocalStateModule() {
  angular
    .module('app/visualize/State', [
      'app/visualize/Private',
      'app/visualize/Config',
      'app/visualize/KbnUrl',
      'app/visualize/Promise',
      'app/visualize/PersistedState',
    ])
    .factory('AppState', function(Private: IPrivate) {
      return Private(AppStateProvider);
    })
    .service('getAppState', function(Private: IPrivate) {
      return Private<AppState>(AppStateProvider).getAppState;
    })
    .service('globalState', function(Private: IPrivate) {
      return Private(GlobalStateProvider);
    });
}

function createLocalPersistedStateModule() {
  angular
    .module('app/visualize/PersistedState', ['app/visualize/Private', 'app/visualize/Promise'])
    .factory('PersistedState', (Private: IPrivate) => {
      const Events = Private(EventsProvider);
      return class AngularPersistedState extends PersistedState {
        constructor(value: any, path: any) {
          super(value, path, Events);
        }
      };
    });
}

function createLocalKbnUrlModule() {
  angular
    .module('app/visualize/KbnUrl', ['app/visualize/Private', 'ngRoute'])
    .service('kbnUrl', (Private: IPrivate) => Private(KbnUrlProvider))
    .service('redirectWhenMissing', (Private: IPrivate) => Private(RedirectWhenMissingProvider));
}

function createLocalConfigModule(core: AppMountContext['core']) {
  angular
    .module('app/visualize/Config', ['app/visualize/Private'])
    .provider('stateManagementConfig', StateManagementConfigProvider)
    .provider('config', () => {
      return {
        $get: () => ({
          get: core.uiSettings.get.bind(core.uiSettings),
        }),
      };
    });
}

function createLocalPromiseModule() {
  angular.module('app/visualize/Promise', []).service('Promise', PromiseServiceCreator);
}

function createLocalPrivateModule() {
  angular.module('app/visualize/Private', []).provider('Private', PrivateProvider);
}

function createLocalTopNavModule(navigation: NavigationStart) {
  angular
    .module('app/visualize/TopNav', ['react'])
    .directive('kbnTopNav', createTopNavDirective)
    .directive('kbnTopNavHelper', createTopNavHelper(navigation.ui));
}

function createLocalI18nModule() {
  angular
    .module('app/visualize/I18n', [])
    .provider('i18n', I18nProvider)
    .filter('i18n', i18nFilter)
    .directive('i18nId', i18nDirective);
}
