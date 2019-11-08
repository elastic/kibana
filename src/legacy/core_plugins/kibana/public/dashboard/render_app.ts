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
import angular, { IModule } from 'angular';
import { IPrivate } from 'ui/private';
import { i18nDirective, i18nFilter, I18nProvider } from '@kbn/i18n/angular';
// @ts-ignore
import { GlobalStateProvider } from 'ui/state_management/global_state';
// @ts-ignore
import { StateManagementConfigProvider } from 'ui/state_management/config_provider';
// @ts-ignore
import { AppStateProvider } from 'ui/state_management/app_state';
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
import {
  AppMountContext,
  ChromeStart,
  LegacyCoreStart,
  SavedObjectsClientContract,
  UiSettingsClientContract,
} from 'kibana/public';
import { configureAppAngularModule } from 'ui/legacy_compat';
import { Storage } from '../../../../../plugins/kibana_utils/public';

// @ts-ignore
import { initDashboardApp } from './app';
import {
  createApplyFiltersPopoverDirective,
  createApplyFiltersPopoverHelper,
  createFilterBarDirective,
  createFilterBarHelper,
  DataStart,
} from '../../../data/public';
import { SavedQueryService } from '../../../data/public/search/search_bar/lib/saved_query_service';
import { EmbeddablePublicPlugin } from '../../../../../plugins/embeddable/public';
import { NavigationStart } from '../../../navigation/public';
import { DataPublicPluginStart as NpDataStart } from '../../../../../plugins/data/public';

export interface RenderDeps {
  core: LegacyCoreStart;
  indexPatterns: DataStart['indexPatterns']['indexPatterns'];
  dataStart: DataStart;
  npDataStart: NpDataStart;
  navigation: NavigationStart;
  shareContextMenuExtensions: any;
  savedObjectsClient: SavedObjectsClientContract;
  savedObjectRegistry: any;
  dashboardConfig: any;
  savedDashboards: any;
  dashboardCapabilities: any;
  docTitle: any;
  uiSettings: UiSettingsClientContract;
  chrome: ChromeStart;
  addBasePath: (path: string) => string;
  savedQueryService: SavedQueryService;
  embeddables: ReturnType<EmbeddablePublicPlugin['start']>;
  localStorage: Storage;
}

let angularModuleInstance: IModule | null = null;

export const renderApp = (element: HTMLElement, appBasePath: string, deps: RenderDeps) => {
  if (!angularModuleInstance) {
    angularModuleInstance = createLocalAngularModule(deps.core, deps.navigation);
    // global routing stuff
    configureAppAngularModule(angularModuleInstance, deps.core as LegacyCoreStart, true);
    // custom routing stuff
    initDashboardApp(angularModuleInstance, deps);
  }
  const $injector = mountDashboardApp(appBasePath, element);
  return () => {
    $injector.get('$rootScope').$destroy();
  };
};

const mainTemplate = (basePath: string) => `<div style="height: 100%">
  <base href="${basePath}" />
  <div ng-view style="height: 100%;"></div>
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
  createLocalFilterBarModule();

  const dashboardAngularModule = angular.module(moduleName, [
    ...thirdPartyAngularDependencies,
    'app/dashboard/Config',
    'app/dashboard/I18n',
    'app/dashboard/Private',
    'app/dashboard/PersistedState',
    'app/dashboard/TopNav',
    'app/dashboard/State',
    'app/dashboard/ConfirmModal',
    'app/dashboard/FilterBar',
  ]);
  return dashboardAngularModule;
}

function createLocalConfirmModalModule() {
  angular
    .module('app/dashboard/ConfirmModal', ['react'])
    .factory('confirmModal', confirmModalFactory)
    .directive('confirmModal', reactDirective => reactDirective(EuiConfirmModal));
}

function createLocalStateModule() {
  angular
    .module('app/dashboard/State', [
      'app/dashboard/Private',
      'app/dashboard/Config',
      'app/dashboard/KbnUrl',
      'app/dashboard/Promise',
      'app/dashboard/PersistedState',
    ])
    .factory('AppState', function(Private: any) {
      return Private(AppStateProvider);
    })
    .service('getAppState', function(Private: any) {
      return Private(AppStateProvider).getAppState;
    })
    .service('globalState', function(Private: any) {
      return Private(GlobalStateProvider);
    });
}

function createLocalPersistedStateModule() {
  angular
    .module('app/dashboard/PersistedState', ['app/dashboard/Private', 'app/dashboard/Promise'])
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
    .module('app/dashboard/KbnUrl', ['app/dashboard/Private', 'ngRoute'])
    .service('kbnUrl', (Private: IPrivate) => Private(KbnUrlProvider))
    .service('redirectWhenMissing', (Private: IPrivate) => Private(RedirectWhenMissingProvider));
}

function createLocalConfigModule(core: AppMountContext['core']) {
  angular
    .module('app/dashboard/Config', ['app/dashboard/Private'])
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

function createLocalFilterBarModule() {
  angular
    .module('app/dashboard/FilterBar', ['react'])
    .directive('filterBar', createFilterBarDirective)
    .directive('filterBarHelper', createFilterBarHelper)
    .directive('applyFiltersPopover', createApplyFiltersPopoverDirective)
    .directive('applyFiltersPopoverHelper', createApplyFiltersPopoverHelper);
}

function createLocalI18nModule() {
  angular
    .module('app/dashboard/I18n', [])
    .provider('i18n', I18nProvider)
    .filter('i18n', i18nFilter)
    .directive('i18nId', i18nDirective);
}
