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
import { IPrivate } from 'ui/private';
import { EuiIcon } from '@elastic/eui';
// @ts-ignore
import { StateProvider } from 'ui/state_management/state';
// @ts-ignore
import { EventsProvider } from 'ui/events';
import { PersistedState } from 'ui/persisted_state';
// @ts-ignore
import { PromiseServiceCreator } from 'ui/promises/promises';
// @ts-ignore
import { createEsService } from 'ui/es';
import { i18nDirective, i18nFilter, I18nProvider } from '@kbn/i18n/angular';
// @ts-ignore
import { PrivateProvider } from 'ui/private/private';
import { CoreStart, LegacyCoreStart, IUiSettingsClient } from 'kibana/public';
// @ts-ignore
import { watchMultiDecorator } from 'ui/directives/watch_multi/watch_multi';
// @ts-ignore
import { registerListenEventListener } from 'ui/directives/listen/listen';
// @ts-ignore
import { KbnAccessibleClickProvider } from 'ui/accessibility/kbn_accessible_click';
// @ts-ignore
import { FieldNameDirectiveProvider } from 'ui/directives/field_name';
// @ts-ignore
import { CollapsibleSidebarProvider } from 'ui/collapsible_sidebar/collapsible_sidebar';
// @ts-ignore
import { CssTruncateProvide } from 'ui/directives/css_truncate';
// @ts-ignore
import { FixedScrollProvider } from 'ui/fixed_scroll';
// @ts-ignore
import { DebounceProviderTimeout } from 'ui/directives/debounce/debounce';
// @ts-ignore
import { AppStateProvider } from 'ui/state_management/app_state';
// @ts-ignore
import { GlobalStateProvider } from 'ui/state_management/global_state';
// @ts-ignore
import { createRenderCompleteDirective } from 'ui/render_complete/directive';
// @ts-ignore
import { StateManagementConfigProvider } from 'ui/state_management/config_provider';
// @ts-ignore
import { KbnUrlProvider, RedirectWhenMissingProvider } from 'ui/url';
// @ts-ignore
import { createTopNavDirective, createTopNavHelper } from 'ui/kbn_top_nav/kbn_top_nav';
import { configureAppAngularModule } from 'ui/legacy_compat';
import { IndexPatterns } from '../../../../../plugins/data/public';
import { Storage } from '../../../../../plugins/kibana_utils/public';
import { NavigationStart } from '../../../navigation/public';
import { createDocTableDirective } from './angular/doc_table/doc_table';
import { createTableHeaderDirective } from './angular/doc_table/components/table_header';
import {
  createToolBarPagerButtonsDirective,
  createToolBarPagerTextDirective,
} from './angular/doc_table/components/pager';
import { createTableRowDirective } from './angular/doc_table/components/table_row';
import { createPagerFactory } from './angular/doc_table/lib/pager/pager_factory';
import { createInfiniteScrollDirective } from './angular/doc_table/infinite_scroll';
import { createDocViewerDirective } from './angular/doc_viewer';
import { createFieldSearchDirective } from './components/field_chooser/discover_field_search_directive';
import { createIndexPatternSelectDirective } from './components/field_chooser/discover_index_pattern_directive';
import { createStringFieldProgressBarDirective } from './components/field_chooser/string_progress_bar';
// @ts-ignore
import { createFieldChooserDirective } from './components/field_chooser/field_chooser';

// @ts-ignore
import { createDiscoverFieldDirective } from './components/field_chooser/discover_field';
import { DiscoverStartPlugins } from './plugin';

/**
 * returns the main inner angular module, it contains all the parts of Angular Discover
 * needs to render, so in the end the current 'kibana' angular module is no longer necessary
 */
export function getInnerAngularModule(name: string, core: CoreStart, deps: DiscoverStartPlugins) {
  const module = initializeInnerAngularModule(name, core, deps.navigation);
  configureAppAngularModule(module, core as LegacyCoreStart, true);
  return module;
}

/**
 * returns a slimmer inner angular module for embeddable rendering
 */
export function getInnerAngularModuleEmbeddable(
  name: string,
  core: CoreStart,
  deps: DiscoverStartPlugins
) {
  const module = initializeInnerAngularModule(name, core, deps.navigation, true);
  configureAppAngularModule(module, core as LegacyCoreStart, true);
  return module;
}

let initialized = false;

export function initializeInnerAngularModule(
  name = 'app/discover',
  core: CoreStart,
  navigation: NavigationStart,
  embeddable = false
) {
  if (!initialized) {
    createLocalI18nModule();
    createLocalPrivateModule();
    createLocalPromiseModule();
    createLocalConfigModule(core.uiSettings);
    createLocalKbnUrlModule();
    createLocalPersistedStateModule();
    createLocalTopNavModule(navigation);
    createLocalGlobalStateModule();
    createLocalAppStateModule();
    createLocalStorageModule();
    createElasticSearchModule();
    createIndexPatternsModule();
    createPagerFactoryModule();
    createDocTableModule();
    initialized = true;
  }

  if (embeddable) {
    return angular
      .module(name, [
        'ngSanitize',
        'react',
        'ui.bootstrap',
        'discoverI18n',
        'discoverPrivate',
        'discoverDocTable',
        'discoverPagerFactory',
        'discoverPersistedState',
      ])
      .config(watchMultiDecorator)
      .directive('icon', reactDirective => reactDirective(EuiIcon))
      .directive('fieldName', FieldNameDirectiveProvider)
      .directive('renderComplete', createRenderCompleteDirective)
      .service('debounce', ['$timeout', DebounceProviderTimeout]);
  }

  return angular
    .module(name, [
      'ngSanitize',
      'ngRoute',
      'react',
      'ui.bootstrap',
      'elasticsearch',
      'discoverConfig',
      'discoverI18n',
      'discoverPrivate',
      'discoverPersistedState',
      'discoverTopNav',
      'discoverGlobalState',
      'discoverAppState',
      'discoverLocalStorageProvider',
      'discoverIndexPatterns',
      'discoverEs',
      'discoverDocTable',
      'discoverPagerFactory',
    ])
    .config(watchMultiDecorator)
    .run(registerListenEventListener)
    .directive('icon', reactDirective => reactDirective(EuiIcon))
    .directive('kbnAccessibleClick', KbnAccessibleClickProvider)
    .directive('fieldName', FieldNameDirectiveProvider)
    .directive('collapsibleSidebar', CollapsibleSidebarProvider)
    .directive('cssTruncate', CssTruncateProvide)
    .directive('fixedScroll', FixedScrollProvider)
    .directive('renderComplete', createRenderCompleteDirective)
    .directive('discoverFieldSearch', createFieldSearchDirective)
    .directive('discoverIndexPatternSelect', createIndexPatternSelectDirective)
    .directive('stringFieldProgressBar', createStringFieldProgressBarDirective)
    .directive('discoverField', createDiscoverFieldDirective)
    .directive('discFieldChooser', createFieldChooserDirective)
    .service('debounce', ['$timeout', DebounceProviderTimeout]);
}

export function createLocalGlobalStateModule() {
  angular
    .module('discoverGlobalState', [
      'discoverPrivate',
      'discoverConfig',
      'discoverKbnUrl',
      'discoverPromise',
    ])
    .service('globalState', function(Private: IPrivate) {
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

function createLocalConfigModule(uiSettings: IUiSettingsClient) {
  angular
    .module('discoverConfig', ['discoverPrivate'])
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

function createLocalPromiseModule() {
  angular.module('discoverPromise', []).service('Promise', PromiseServiceCreator);
}

function createLocalPrivateModule() {
  angular.module('discoverPrivate', []).provider('Private', PrivateProvider);
}

function createLocalTopNavModule(navigation: NavigationStart) {
  angular
    .module('discoverTopNav', ['react'])
    .directive('kbnTopNav', createTopNavDirective)
    .directive('kbnTopNavHelper', createTopNavHelper(navigation.ui));
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
    .service('AppState', function(Private: IPrivate) {
      return Private(AppStateProvider);
    })
    .service('getAppState', function(Private: any) {
      return Private(AppStateProvider).getAppState;
    })
    .service('State', function(Private: any) {
      return Private(StateProvider);
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

function createIndexPatternsModule() {
  angular.module('discoverIndexPatterns', []).value('indexPatterns', IndexPatterns);
}

function createPagerFactoryModule() {
  angular.module('discoverPagerFactory', []).factory('pagerFactory', createPagerFactory);
}

function createDocTableModule() {
  angular
    .module('discoverDocTable', [
      'discoverKbnUrl',
      'discoverConfig',
      'discoverAppState',
      'discoverPagerFactory',
      'react',
    ])
    .directive('docTable', createDocTableDirective)
    .directive('kbnTableHeader', createTableHeaderDirective)
    .directive('toolBarPagerText', createToolBarPagerTextDirective)
    .directive('toolBarPagerText', createToolBarPagerTextDirective)
    .directive('kbnTableRow', createTableRowDirective)
    .directive('toolBarPagerButtons', createToolBarPagerButtonsDirective)
    .directive('kbnInfiniteScroll', createInfiniteScrollDirective)
    .directive('docViewer', createDocViewerDirective);
}
