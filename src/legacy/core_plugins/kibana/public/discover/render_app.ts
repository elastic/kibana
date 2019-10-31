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

// inner angular imports
// these are necessary to bootstrap the local angular.
// They can stay even after NP cutover
import angular from 'angular';
import { i18nDirective, i18nFilter, I18nProvider } from '@kbn/i18n/angular';
import { EuiIcon } from '@elastic/eui';
import 'ui/angular-bootstrap';
import 'ui/kbn_top_nav';
// @ts-ignore
import { GlobalStateProvider } from 'ui/state_management/global_state';
// @ts-ignore
import { StateManagementConfigProvider } from 'ui/state_management/config_provider';
// @ts-ignore
import { PrivateProvider } from 'ui/private/private';
// @ts-ignore
import { EventsProvider } from 'ui/events';
// @ts-ignore
import { PersistedState } from 'ui/persisted_state';
// @ts-ignore
import { createTopNavDirective, createTopNavHelper } from 'ui/kbn_top_nav/kbn_top_nav';
// @ts-ignore
import { PromiseServiceCreator } from 'ui/promises/promises';
// @ts-ignore
import { KbnUrlProvider, RedirectWhenMissingProvider } from 'ui/url';
// @ts-ignore
import { AppStateProvider } from 'ui/state_management/app_state';
// @ts-ignore
// import { createCourierService } from 'ui/courier/courier';
import { Storage } from 'ui/storage';

import { IndexPatterns } from 'ui/index_patterns';
// @ts-ignore
import { createEsService } from 'ui/es';

import { configureAppAngularModule } from 'ui/legacy_compat';
// type imports
import { IPrivate } from 'ui/private';
import { AppMountContext } from 'kibana/public';
// @ts-ignore
import { watchMultiDecorator } from 'ui/directives/watch_multi/watch_multi';
// @ts-ignore
import { KbnAccessibleClickProvider } from 'ui/accessibility/kbn_accessible_click';
// @ts-ignore
import { FieldNameDirectiveProvider } from 'ui/directives/field_name';
// @ts-ignore
import { CollapsibleSidebarProvider } from 'ui/collapsible_sidebar/collapsible_sidebar';
// @ts-ignore
import { FixedScrollProvider } from 'ui/fixed_scroll';
// @ts-ignore
import { DebounceProviderTimeout } from 'ui/directives/debounce/debounce';
// @ts-ignore
import { CssTruncateProvide } from 'ui/directives/css_truncate';

// @ts-ignore
import { registerListenEventListener } from 'ui/directives/listen/listen';

import { setAngularModule, setServices } from './kibana_services';
// @ts-ignore
import { dashboardConfigProvider } from '../dashboard/dashboard_config';

const moduleName = 'app/discover';
const thirdPartyAngularDependencies = [
  'ngSanitize',
  'ngRoute',
  'react',
  'ui.bootstrap',
  'elasticsearch',
];
let discoverUiModule: any;

export function getDiscoverModule(core: AppMountContext['core']) {
  if (!discoverUiModule) {
    discoverUiModule = createLocalAngularModule(core);
  }
  configureAppAngularModule(discoverUiModule);
  setAngularModule(discoverUiModule);
  return getDiscoverModule;
}

export async function renderApp(
  element: HTMLElement,
  appBasePath: string,
  { core }: AppMountContext,
  angularDeps: any
) {
  getDiscoverModule(core);
  setServices(angularDeps);
  require('./angular');
  const $injector = mountDiscoverApp(appBasePath, element);
  return () => $injector.get('$rootScope').$destroy();
}

const mainTemplate = (basePath: string) => `<div style="height: 100%">
  <base href="${basePath}" />
  <div ng-view style="height: 100%; display:flex; justify-content: center;"></div>
</div>
`;

function mountDiscoverApp(appBasePath: string, element: HTMLElement) {
  const mountpoint = document.createElement('div');
  mountpoint.setAttribute('style', 'height: 100%');
  // eslint-disable-next-line
  mountpoint.innerHTML = mainTemplate(appBasePath);
  // bootstrap angular into detached element and attach it later to
  // make angular-within-angular possible
  const $injector = angular.bootstrap(mountpoint, [moduleName]);
  // initialize global state handler
  $injector.get('globalState');
  element.appendChild(mountpoint);
  return $injector;
}

export function createLocalAngularModule(core: AppMountContext['core']) {
  createLocalI18nModule();
  createLocalPrivateModule();
  createLocalPromiseModule();
  createLocalConfigModule(core);
  createLocalKbnUrlModule();
  createLocalPersistedStateModule();
  createLocalTopNavModule();
  createLocalGlobalStateModule();
  createLocalAppStateModule();
  createLocalStorageModule();
  createElasticSearchModule();
  createDashboardConfigModule();
  createIndexPatternsModule();
  createChromeModule(core.chrome);

  return angular
    .module(moduleName, [
      ...thirdPartyAngularDependencies,
      'discoverI18n',
      'discoverPrivate',
      'discoverPersistedState',
      'discoverTopNav',
      'discoverGlobalState',
      'discoverAppState',
      'discoverLocalStorageProvider',
      'discoverDashboardConfigProvider',
      'discoverIndexPatterns',
      'discoverChrome',
      'discoverEs',
    ])
    .config(watchMultiDecorator)
    .run(registerListenEventListener)
    .directive('icon', reactDirective => reactDirective(EuiIcon))
    .directive('kbnAccessibleClick', KbnAccessibleClickProvider)
    .directive('fieldName', FieldNameDirectiveProvider)
    .directive('collapsibleSidebar', CollapsibleSidebarProvider)
    .directive('cssTruncate', CssTruncateProvide)
    .service('debounce', ['$timeout', DebounceProviderTimeout])
    .directive('fixedScroll', FixedScrollProvider);
}

export function createLocalGlobalStateModule() {
  angular
    .module('discoverGlobalState', [
      'discoverPrivate',
      'discoverConfig',
      'discoverKbnUrl',
      'discoverPromise',
    ])
    .service('globalState', function(Private: any) {
      return Private(GlobalStateProvider);
    });
}

function createLocalPersistedStateModule() {
  angular
    .module('discoverPersistedState', ['discoverPrivate', 'discoverPromise'])
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
    .module('discoverKbnUrl', ['discoverPrivate', 'ngRoute'])
    .service('kbnUrl', (Private: IPrivate) => Private(KbnUrlProvider))
    .service('redirectWhenMissing', (Private: IPrivate) => Private(RedirectWhenMissingProvider));
}

function createLocalConfigModule(core: AppMountContext['core']) {
  angular
    .module('discoverConfig', ['discoverPrivate'])
    .provider('stateManagementConfig', StateManagementConfigProvider)
    .provider('config', () => {
      return {
        $get: () => ({
          get: (value: string) => {
            return core.uiSettings ? core.uiSettings.get(value) : undefined;
          },
        }),
      };
    });
}

function createLocalPromiseModule() {
  angular.module('discoverPromise', []).service('Promise', PromiseServiceCreator);
}

function createLocalPrivateModule() {
  angular.module('discoverPrivate', []).provider('Private', PrivateProvider);
}

function createLocalTopNavModule() {
  angular
    .module('discoverTopNav', ['react'])
    .directive('kbnTopNav', createTopNavDirective)
    .directive('kbnTopNavHelper', createTopNavHelper);
}

function createLocalI18nModule() {
  angular
    .module('discoverI18n', [])
    .provider('i18n', I18nProvider)
    .filter('i18n', i18nFilter)
    .directive('i18nId', i18nDirective);
}

function createLocalAppStateModule() {
  angular
    .module('discoverAppState', [
      'discoverGlobalState',
      'discoverPrivate',
      'discoverConfig',
      'discoverKbnUrl',
      'discoverPromise',
    ])
    .service('AppState', function(Private: any) {
      return Private(AppStateProvider);
    })
    .service('getAppState', function(Private: any) {
      return Private(AppStateProvider).getAppState;
    });
}

function createLocalStorageModule() {
  angular
    .module('discoverLocalStorageProvider', ['discoverPrivate'])
    .service('localStorage', createLocalStorageService('localStorage'))
    .service('sessionStorage', createLocalStorageService('sessionStorage'));
}

const createLocalStorageService = function(type: string) {
  return function($window: any) {
    return new Storage($window[type]);
  };
};

function createElasticSearchModule() {
  angular
    .module('discoverEs', ['elasticsearch', 'discoverConfig'])
    // Elasticsearch client used for requesting data.  Connects to the /elasticsearch proxy
    .service('es', createEsService);
}

function createDashboardConfigModule() {
  angular
    .module('discoverDashboardConfigProvider', [])
    .provider('dashboardConfig', dashboardConfigProvider);
}

function createIndexPatternsModule() {
  angular.module('discoverIndexPatterns', []).service('indexPatterns', IndexPatterns);
}

function createChromeModule(chrome: any) {
  angular.module('discoverChrome', []).service('chrome', chrome);
}
