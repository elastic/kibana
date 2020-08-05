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

import './index.scss';

import { EuiIcon } from '@elastic/eui';
import angular, { IModule } from 'angular';
// required for `ngSanitize` angular module
import 'angular-sanitize';
import { i18nDirective, i18nFilter, I18nProvider } from '@kbn/i18n/angular';
import {
  ChromeStart,
  IUiSettingsClient,
  CoreStart,
  SavedObjectsClientContract,
  PluginInitializerContext,
  ScopedHistory,
} from 'kibana/public';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/public';
import { Storage } from '../../../kibana_utils/public';
// @ts-ignore
import { initDashboardApp } from './legacy_app';
import { EmbeddableStart } from '../../../embeddable/public';
import { NavigationPublicPluginStart as NavigationStart } from '../../../navigation/public';
import { DataPublicPluginStart } from '../../../data/public';
import { SharePluginStart } from '../../../share/public';
import { KibanaLegacyStart, configureAppAngularModule } from '../../../kibana_legacy/public';
import { SavedObjectLoader, SavedObjectsStart } from '../../../saved_objects/public';

// required for i18nIdDirective
import 'angular-sanitize';
// required for ngRoute
import 'angular-route';

export interface RenderDeps {
  pluginInitializerContext: PluginInitializerContext;
  core: CoreStart;
  data: DataPublicPluginStart;
  navigation: NavigationStart;
  savedObjectsClient: SavedObjectsClientContract;
  savedDashboards: SavedObjectLoader;
  dashboardConfig: KibanaLegacyStart['dashboardConfig'];
  dashboardCapabilities: any;
  embeddableCapabilities: {
    visualizeCapabilities: any;
    mapsCapabilities: any;
  };
  uiSettings: IUiSettingsClient;
  chrome: ChromeStart;
  addBasePath: (path: string) => string;
  savedQueryService: DataPublicPluginStart['query']['savedQueries'];
  embeddable: EmbeddableStart;
  localStorage: Storage;
  share?: SharePluginStart;
  usageCollection?: UsageCollectionSetup;
  navigateToDefaultApp: KibanaLegacyStart['navigateToDefaultApp'];
  navigateToLegacyKibanaUrl: KibanaLegacyStart['navigateToLegacyKibanaUrl'];
  scopedHistory: () => ScopedHistory;
  savedObjects: SavedObjectsStart;
  restorePreviousUrl: () => void;
}

let angularModuleInstance: IModule | null = null;

export const renderApp = (element: HTMLElement, appBasePath: string, deps: RenderDeps) => {
  if (!angularModuleInstance) {
    angularModuleInstance = createLocalAngularModule();
    // global routing stuff
    configureAppAngularModule(
      angularModuleInstance,
      { core: deps.core, env: deps.pluginInitializerContext.env },
      true,
      deps.scopedHistory
    );
    initDashboardApp(angularModuleInstance, deps);
  }

  const $injector = mountDashboardApp(appBasePath, element);

  return () => {
    ($injector.get('kbnUrlStateStorage') as any).cancel();
    $injector.get('$rootScope').$destroy();
  };
};

const mainTemplate = (basePath: string) => `<div ng-view class="dshAppContainer">
  <base href="${basePath}" />
</div>`;

const moduleName = 'app/dashboard';

const thirdPartyAngularDependencies = ['ngSanitize', 'ngRoute', 'react'];

function mountDashboardApp(appBasePath: string, element: HTMLElement) {
  const mountpoint = document.createElement('div');
  mountpoint.setAttribute('class', 'dshAppContainer');
  // eslint-disable-next-line
  mountpoint.innerHTML = mainTemplate(appBasePath);
  // bootstrap angular into detached element and attach it later to
  // make angular-within-angular possible
  const $injector = angular.bootstrap(mountpoint, [moduleName]);
  // initialize global state handler
  element.appendChild(mountpoint);
  return $injector;
}

function createLocalAngularModule() {
  createLocalI18nModule();
  createLocalIconModule();

  const dashboardAngularModule = angular.module(moduleName, [
    ...thirdPartyAngularDependencies,
    'app/dashboard/I18n',
    'app/dashboard/icon',
  ]);
  return dashboardAngularModule;
}

function createLocalIconModule() {
  angular
    .module('app/dashboard/icon', ['react'])
    .directive('icon', (reactDirective) => reactDirective(EuiIcon));
}

function createLocalI18nModule() {
  angular
    .module('app/dashboard/I18n', [])
    .provider('i18n', I18nProvider)
    .filter('i18n', i18nFilter)
    .directive('i18nId', i18nDirective);
}
