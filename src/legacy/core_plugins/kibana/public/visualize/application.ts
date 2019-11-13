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
import { IModule, IAngularStatic } from 'angular';
import { i18nDirective, i18nFilter, I18nProvider } from '@kbn/i18n/src/angular';

import { IPrivate } from 'ui/private';
import { configureAppAngularModule } from 'ui/legacy_compat';
// @ts-ignore
import { GlobalStateProvider } from 'ui/state_management/global_state';
// @ts-ignore
import { StateManagementConfigProvider } from 'ui/state_management/config_provider';
// @ts-ignore
import { AppStateProvider, AppState } from 'ui/state_management/app_state';
// @ts-ignore
import { PrivateProvider } from 'ui/private/private';
// @ts-ignore
import { EventsProvider } from 'ui/events';
import { PersistedState } from 'ui/persisted_state';
// @ts-ignore
import { createTopNavDirective, createTopNavHelper } from 'ui/kbn_top_nav/kbn_top_nav';
// @ts-ignore
import { PromiseServiceCreator } from 'ui/promises/promises';
// @ts-ignore
import { KbnUrlProvider, RedirectWhenMissingProvider } from 'ui/url';
// @ts-ignore
import { confirmModalFactory } from 'ui/modals/confirm_modal';

import { AppMountContext, LegacyCoreStart } from 'kibana/public';
import {
  createApplyFiltersPopoverDirective,
  createApplyFiltersPopoverHelper,
  createFilterBarDirective,
  createFilterBarHelper,
} from '../../../data/public';
import { NavigationStart } from '../../../navigation/public';

// @ts-ignore
import { initVisualizeApp } from './app';
import { VisualizeKibanaServices } from './kibana_services';

let angularModuleInstance: IModule | null = null;

export const renderApp = async (
  element: HTMLElement,
  appBasePath: string,
  deps: VisualizeKibanaServices
) => {
  if (!angularModuleInstance) {
    angularModuleInstance = createLocalAngularModule(deps.core, deps.navigation, deps.angular);
    // global routing stuff
    configureAppAngularModule(angularModuleInstance, deps.core as LegacyCoreStart, true);
    // custom routing stuff
    initVisualizeApp(angularModuleInstance, deps);
  }
  const $injector = mountVisualizeApp(appBasePath, element, deps.angular);
  return () => {
    $injector.get('$rootScope').$destroy();
  };
};

const mainTemplate = (basePath: string) => `<div style="height: 100%">
  <base href="${basePath}" />
  <div ng-view style="height: 100%;"></div>
</div>
`;

const moduleName = 'app/visualize';

const thirdPartyAngularDependencies = ['ngSanitize', 'ngRoute', 'react'];

function mountVisualizeApp(appBasePath: string, element: HTMLElement, angular: IAngularStatic) {
  const mountpoint = document.createElement('div');
  mountpoint.setAttribute('style', 'height: 100%');
  mountpoint.innerHTML = mainTemplate(appBasePath);
  // bootstrap angular into detached element and attach it later to
  // make angular-within-angular possible
  const $injector = angular.bootstrap(mountpoint, [moduleName]);
  // initialize global state handler
  // $injector.get('globalState');
  element.appendChild(mountpoint);
  return $injector;
}

function createLocalAngularModule(
  core: AppMountContext['core'],
  navigation: NavigationStart,
  angular: IAngularStatic
) {
  createLocalI18nModule(angular);
  createLocalPrivateModule(angular);
  createLocalPromiseModule(angular);
  createLocalConfigModule(core, angular);
  createLocalKbnUrlModule(angular);
  createLocalStateModule(angular);
  createLocalPersistedStateModule(angular);
  createLocalTopNavModule(navigation, angular);
  createLocalConfirmModalModule(angular);
  createLocalFilterBarModule(angular);

  const visualizeAngularModule: IModule = angular.module(moduleName, [
    ...thirdPartyAngularDependencies,
    'app/visualize/Config',
    'app/visualize/I18n',
    'app/visualize/Private',
    'app/visualize/PersistedState',
    'app/visualize/TopNav',
    'app/visualize/State',
    'app/visualize/ConfirmModal',
    'app/visualize/FilterBar',
  ]);
  return visualizeAngularModule;
}

function createLocalConfirmModalModule(angular: IAngularStatic) {
  angular
    .module('app/visualize/ConfirmModal', ['react'])
    .factory('confirmModal', confirmModalFactory)
    .directive('confirmModal', reactDirective => reactDirective(EuiConfirmModal));
}

function createLocalStateModule(angular: IAngularStatic) {
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

function createLocalPersistedStateModule(angular: IAngularStatic) {
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

function createLocalKbnUrlModule(angular: IAngularStatic) {
  angular
    .module('app/visualize/KbnUrl', ['app/visualize/Private', 'ngRoute'])
    .service('kbnUrl', (Private: IPrivate) => Private(KbnUrlProvider))
    .service('redirectWhenMissing', (Private: IPrivate) => Private(RedirectWhenMissingProvider));
}

function createLocalConfigModule(core: AppMountContext['core'], angular: IAngularStatic) {
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

function createLocalPromiseModule(angular: IAngularStatic) {
  angular.module('app/visualize/Promise', []).service('Promise', PromiseServiceCreator);
}

function createLocalPrivateModule(angular: IAngularStatic) {
  angular.module('app/visualize/Private', []).provider('Private', PrivateProvider);
}

function createLocalTopNavModule(navigation: NavigationStart, angular: IAngularStatic) {
  angular
    .module('app/visualize/TopNav', ['react'])
    .directive('kbnTopNav', createTopNavDirective)
    .directive('kbnTopNavHelper', createTopNavHelper(navigation.ui));
}

function createLocalFilterBarModule(angular: IAngularStatic) {
  angular
    .module('app/visualize/FilterBar', ['react'])
    .directive('filterBar', createFilterBarDirective)
    .directive('filterBarHelper', createFilterBarHelper)
    .directive('applyFiltersPopover', createApplyFiltersPopoverDirective)
    .directive('applyFiltersPopoverHelper', createApplyFiltersPopoverHelper);
}

function createLocalI18nModule(angular: IAngularStatic) {
  angular
    .module('app/visualize/I18n', [])
    .provider('i18n', I18nProvider)
    .filter('i18n', i18nFilter)
    .directive('i18nId', i18nDirective);
}
