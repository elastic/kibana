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
// required for `ngSanitize` angular module
import 'angular-sanitize';
import { EuiIcon } from '@elastic/eui';
import { i18nDirective, i18nFilter, I18nProvider } from '@kbn/i18n/angular';
import { CoreStart, LegacyCoreStart } from 'kibana/public';
import { DataPublicPluginStart } from '../../../../../plugins/data/public';
import { Storage } from '../../../../../plugins/kibana_utils/public';
import { NavigationPublicPluginStart as NavigationStart } from '../../../../../plugins/navigation/public';
import { createDocTableDirective } from './np_ready/angular/doc_table';
import { createTableHeaderDirective } from './np_ready/angular/doc_table/components/table_header';
import {
  createToolBarPagerButtonsDirective,
  createToolBarPagerTextDirective,
} from './np_ready/angular/doc_table/components/pager';
import { createTableRowDirective } from './np_ready/angular/doc_table/components/table_row';
import { createPagerFactory } from './np_ready/angular/doc_table/lib/pager/pager_factory';
import { createInfiniteScrollDirective } from './np_ready/angular/doc_table/infinite_scroll';
import { createDocViewerDirective } from './np_ready/angular/doc_viewer';
import { CollapsibleSidebarProvider } from './np_ready/angular/directives/collapsible_sidebar/collapsible_sidebar';
import { DiscoverStartPlugins } from './plugin';
// @ts-ignore
import { FixedScrollProvider } from './np_ready/angular/directives/fixed_scroll';
// @ts-ignore
import { DebounceProviderTimeout } from './np_ready/angular/directives/debounce/debounce';
import { createRenderCompleteDirective } from './np_ready/angular/directives/render_complete';
import {
  initAngularBootstrap,
  configureAppAngularModule,
  KbnAccessibleClickProvider,
  PrivateProvider,
  PromiseServiceCreator,
  registerListenEventListener,
  watchMultiDecorator,
  createTopNavDirective,
  createTopNavHelper,
} from '../../../../../plugins/kibana_legacy/public';
import { createDiscoverSidebarDirective } from './np_ready/components/sidebar';

/**
 * returns the main inner angular module, it contains all the parts of Angular Discover
 * needs to render, so in the end the current 'kibana' angular module is no longer necessary
 */
export function getInnerAngularModule(name: string, core: CoreStart, deps: DiscoverStartPlugins) {
  initAngularBootstrap();
  const module = initializeInnerAngularModule(name, core, deps.navigation, deps.data);
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
  const module = initializeInnerAngularModule(name, core, deps.navigation, deps.data, true);
  configureAppAngularModule(module, core as LegacyCoreStart, true);
  return module;
}

let initialized = false;

export function initializeInnerAngularModule(
  name = 'app/discover',
  core: CoreStart,
  navigation: NavigationStart,
  data: DataPublicPluginStart,
  embeddable = false
) {
  if (!initialized) {
    createLocalI18nModule();
    createLocalPrivateModule();
    createLocalPromiseModule();
    createLocalTopNavModule(navigation);
    createLocalStorageModule();
    createElasticSearchModule(data);
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
        'discoverPromise',
      ])
      .config(watchMultiDecorator)
      .directive('icon', reactDirective => reactDirective(EuiIcon))
      .directive('renderComplete', createRenderCompleteDirective)
      .service('debounce', ['$timeout', DebounceProviderTimeout]);
  }

  return angular
    .module(name, [
      'ngSanitize',
      'ngRoute',
      'react',
      'ui.bootstrap',
      'discoverI18n',
      'discoverPrivate',
      'discoverPromise',
      'discoverTopNav',
      'discoverLocalStorageProvider',
      'discoverEs',
      'discoverDocTable',
      'discoverPagerFactory',
    ])
    .config(watchMultiDecorator)
    .run(registerListenEventListener)
    .directive('icon', reactDirective => reactDirective(EuiIcon))
    .directive('kbnAccessibleClick', KbnAccessibleClickProvider)
    .directive('collapsibleSidebar', CollapsibleSidebarProvider)
    .directive('fixedScroll', FixedScrollProvider)
    .directive('renderComplete', createRenderCompleteDirective)
    .directive('discoverSidebar', createDiscoverSidebarDirective)
    .service('debounce', ['$timeout', DebounceProviderTimeout]);
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

function createElasticSearchModule(data: DataPublicPluginStart) {
  angular
    .module('discoverEs', [])
    // Elasticsearch client used for requesting data.  Connects to the /elasticsearch proxy
    .service('es', () => {
      return data.search.__LEGACY.esClient;
    });
}

function createPagerFactoryModule() {
  angular.module('discoverPagerFactory', []).factory('pagerFactory', createPagerFactory);
}

function createDocTableModule() {
  angular
    .module('discoverDocTable', ['discoverPagerFactory', 'react'])
    .directive('docTable', createDocTableDirective)
    .directive('kbnTableHeader', createTableHeaderDirective)
    .directive('toolBarPagerText', createToolBarPagerTextDirective)
    .directive('kbnTableRow', createTableRowDirective)
    .directive('toolBarPagerButtons', createToolBarPagerButtonsDirective)
    .directive('kbnInfiniteScroll', createInfiniteScrollDirective)
    .directive('docViewer', createDocViewerDirective);
}
