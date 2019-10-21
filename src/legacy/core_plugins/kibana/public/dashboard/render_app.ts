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

import { EuiConfirmModal } from '@elastic/eui';
import angular from 'angular';
import { IPrivate } from 'ui/private';
import { i18nDirective, i18nFilter, I18nProvider } from '@kbn/i18n/src/angular';
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
import { confirmModalFactory } from 'ui/modals/confirm_modal';

import { AppMountContext, ChromeStart, SavedObjectsClientContract, UiSettingsClientContract } from 'kibana/public';
import { configureAppAngularModule } from 'ui/legacy_compat';

// @ts-ignore
import { initDashboardApp } from './app';
import { DataStart } from '../../../data/public';
import { FilterBarQueryFilterProvider } from 'ui/filter_manager/query_filter';
import { getUnhashableStatesProvider } from 'ui/state_management/state_hashing/get_unhashable_states_provider';
import { ShareContextMenuExtensionsRegistryProvider } from 'ui/share';
import { SavedQueryService } from '../../../data/public/search/search_bar/lib/saved_query_service';

export interface RenderDeps {
  core: AppMountContext['core'];
  indexPatterns: DataStart['indexPatterns']['indexPatterns'];
  queryFilter: any;
  getUnhashableStates: any;
  shareContextMenuExtensions: any;
  savedObjectRegistry: any;
  savedObjectsClient: SavedObjectsClientContract;
  dashboardConfig: any;
  uiSettings: UiSettingsClientContract;
  savedDashboards: any;
  chrome: ChromeStart;
  addBasePath: (path: string) => string;
  featureCatalogueRegistryProvider: any;
  dashboardCapabilities: any;
  savedQueryService: SavedQueryService;
  emebeddables: EmbeddableStart;
}

export const renderApp = (element: HTMLElement, appBasePath: string, { core }: RenderDeps) => {
  const dashboardAngularModule = createLocalAngularModule(core);
  configureAppAngularModule(dashboardAngularModule);
  initDashboardApp(dashboardAngularModule);
  const $injector = mountDashboardApp(appBasePath, element);
  return () => $injector.get('$rootScope').$destroy();
};

const mainTemplate = (basePath: string) => `<div style="height: 100%">
  <base href="${basePath}" />
  <div ng-view style="height: 100%; display:flex; justify-content: center;"></div>
</div>
`;

const moduleName = 'app/dashboard';

const thirdPartyAngularDependencies = ['ngSanitize', 'ngRoute', 'react'];

function mountDashboardApp(appBasePath: string, element: HTMLElement) {
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

function createLocalAngularModule(core: AppMountContext['core']) {
  createLocalI18nModule();
  createLocalPrivateModule();
  createLocalPromiseModule();
  createLocalConfigModule(core);
  createLocalKbnUrlModule();
  createLocalPersistedStateModule();
  createLocalTopNavModule();
  createLocalGlobalStateModule();
  createLocalConfirmModalModule();

  const dashboardAngularModule = angular.module(moduleName, [
    ...thirdPartyAngularDependencies,
    'dashboardConfig',
    'dashboardI18n',
    'dashboardPrivate',
    'dashboardPersistedState',
    'dashboardTopNav',
    'dashboardGlobalState',
    'dashboardConfirmModal',
  ]);
  return dashboardAngularModule;
}

function createLocalConfirmModalModule() {
  angular
    .module('dashboardConfirmModal', ['react'])
    .factory('confirmModal', confirmModalFactory)
    .directive('confirmModal', reactDirective => reactDirective(EuiConfirmModal));
}

function createLocalGlobalStateModule() {
  angular
    .module('dashboardGlobalState', [
      'dashboardPrivate',
      'dashboardConfig',
      'dashboardKbnUrl',
      'dashboardPromise',
    ])
    .service('globalState', function(Private: any) {
      return Private(GlobalStateProvider);
    });
}

function createLocalPersistedStateModule() {
  angular
    .module('dashboardPersistedState', ['dashboardPrivate', 'dashboardPromise'])
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
    .module('dashboardKbnUrl', ['dashboardPrivate', 'ngRoute'])
    .service('kbnUrl', (Private: IPrivate) => Private(KbnUrlProvider))
    .service('redirectWhenMissing', (Private: IPrivate) => Private(RedirectWhenMissingProvider));
}

function createLocalConfigModule(core: AppMountContext['core']) {
  angular
    .module('dashboardConfig', ['dashboardPrivate'])
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
  angular.module('dashboardPromise', []).service('Promise', PromiseServiceCreator);
}

function createLocalPrivateModule() {
  angular.module('dashboardPrivate', []).provider('Private', PrivateProvider);
}

function createLocalTopNavModule() {
  angular
    .module('dashboardTopNav', ['react'])
    .directive('kbnTopNav', createTopNavDirective)
    .directive('kbnTopNavHelper', createTopNavHelper);
}

function createLocalI18nModule() {
  angular
    .module('dashboardI18n', [])
    .provider('i18n', I18nProvider)
    .filter('i18n', i18nFilter)
    .directive('i18nId', i18nDirective);
}
