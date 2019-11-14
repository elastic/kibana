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
import 'ui/angular-bootstrap';
import { i18nDirective, i18nFilter, I18nProvider } from '@kbn/i18n/angular';
// @ts-ignore
import { PrivateProvider } from 'ui/private/private';
import { CoreStart, LegacyCoreStart, UiSettingsClientContract } from 'kibana/public';
// @ts-ignore
import { watchMultiDecorator } from 'ui/directives/watch_multi/watch_multi';
// @ts-ignore
import { GlobalStateProvider } from 'ui/state_management/global_state';
// @ts-ignore
import { StateManagementConfigProvider } from 'ui/state_management/config_provider';
// @ts-ignore
import { createTopNavDirective, createTopNavHelper } from 'ui/kbn_top_nav/kbn_top_nav';
import { configureAppAngularModule } from 'ui/legacy_compat';

import {
  PaginateDirectiveProvider,
  PaginateControlsDirectiveProvider,
  // @ts-ignore
} from 'ui/directives/paginate';

import { NavigationStart } from '../../navigation/public';

const thirdPartyAngularDependencies = [
  'ngSanitize',
  'ngRoute',
  'react',
  'ui.bootstrap',
  'RecursionHelper',
];

export function getAngularModule(name: string, core: CoreStart, deps: any) {
  const discoverUiModule = getInnerAngular(name, core, deps.navigation);
  configureAppAngularModule(discoverUiModule, core as LegacyCoreStart, true);
  return discoverUiModule;
}

let initialized = false;

export function getInnerAngular(
  name = 'kibana/table_vis',
  core: CoreStart,
  navigation: NavigationStart
) {
  if (!initialized) {
    createLocalPrivateModule();
    createLocalI18nModule();
    createLocalTopNavModule(navigation);
    createLocalConfigModule(core.uiSettings);
    createLocalPaginateModule();
    initialized = true;
  }
  return angular
    .module(name, [
      ...thirdPartyAngularDependencies,
      'tableVisPaginate',
      'tableVisConfig',
      'tableVisPrivate',
      'tableVisTopNav',
      'tableVisI18n',
    ])
    .config(watchMultiDecorator);
}

function createLocalPrivateModule() {
  angular.module('tableVisPrivate', []).provider('Private', PrivateProvider);
}

function createLocalConfigModule(uiSettings: UiSettingsClientContract) {
  angular
    .module('tableVisConfig', ['tableVisPrivate'])
    .provider('stateManagementConfig', StateManagementConfigProvider)
    .provider('config', () => {
      return {
        $get: () => ({
          get: (value: string) => {
            return uiSettings ? uiSettings.get(value) : undefined;
          },
        }),
      };
    });
}

export function createLocalGlobalStateModule() {
  angular
    .module('tableVisGlobalState', [
      'tableVisPrivate',
      'tableVisConfig',
      'tableVisKbnUrl',
      'tableVisPromise',
    ])
    .service('globalState', function(Private: any) {
      return Private(GlobalStateProvider);
    });
}

function createLocalTopNavModule(navigation: NavigationStart) {
  angular
    .module('tableVisTopNav', ['react'])
    .directive('kbnTopNav', createTopNavDirective)
    .directive('kbnTopNavHelper', createTopNavHelper(navigation.ui));
}

function createLocalI18nModule() {
  angular
    .module('tableVisI18n', [])
    .provider('i18n', I18nProvider)
    .filter('i18n', i18nFilter)
    .directive('i18nId', i18nDirective);
}

function createLocalPaginateModule() {
  angular
    .module('tableVisPaginate', [])
    .directive('paginate', PaginateDirectiveProvider)
    .directive('paginateControls', PaginateControlsDirectiveProvider);
}
