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
// required for ngRoute
import 'angular-route';
import 'angular-sortable-view';
import { i18nDirective, i18nFilter, I18nProvider } from '@kbn/i18n/angular';
import {
  IUiSettingsClient,
  CoreStart,
  PluginInitializerContext,
  AppMountParameters,
} from 'kibana/public';
import { getTimeChart } from './panels/timechart/timechart';
import { Panel } from './panels/panel';

import {
  configureAppAngularModule,
  createTopNavDirective,
  createTopNavHelper,
} from '../../kibana_legacy/public';
import { TimelionPluginDependencies } from './plugin';
import { DataPublicPluginStart } from '../../data/public';
// @ts-ignore
import { initTimelionApp } from './app';

export interface RenderDeps {
  pluginInitializerContext: PluginInitializerContext;
  mountParams: AppMountParameters;
  core: CoreStart;
  plugins: TimelionPluginDependencies;
  timelionPanels: Map<string, Panel>;
}

export interface TimelionVisualizationDependencies {
  uiSettings: IUiSettingsClient;
  timelionPanels: Map<string, Panel>;
  data: DataPublicPluginStart;
  $rootScope: any;
  $compile: any;
}

let angularModuleInstance: IModule | null = null;

export const renderApp = (deps: RenderDeps) => {
  if (!angularModuleInstance) {
    angularModuleInstance = createLocalAngularModule(deps);
    // global routing stuff
    configureAppAngularModule(
      angularModuleInstance,
      { core: deps.core, env: deps.pluginInitializerContext.env },
      true
    );
    initTimelionApp(angularModuleInstance, deps);
  }

  const $injector = mountTimelionApp(deps.mountParams.appBasePath, deps.mountParams.element, deps);

  return () => {
    $injector.get('$rootScope').$destroy();
  };
};

function registerPanels(dependencies: TimelionVisualizationDependencies) {
  const timeChartPanel: Panel = getTimeChart(dependencies);

  dependencies.timelionPanels.set(timeChartPanel.name, timeChartPanel);
}

const mainTemplate = (basePath: string) => `<div ng-view class="timelionAppContainer">
  <base href="${basePath}" />
</div>`;

const moduleName = 'app/timelion';

const thirdPartyAngularDependencies = ['ngSanitize', 'ngRoute', 'react', 'angular-sortable-view'];

function mountTimelionApp(appBasePath: string, element: HTMLElement, deps: RenderDeps) {
  const mountpoint = document.createElement('div');
  mountpoint.setAttribute('class', 'timelionAppContainer');
  // eslint-disable-next-line
  mountpoint.innerHTML = mainTemplate(appBasePath);
  // bootstrap angular into detached element and attach it later to
  // make angular-within-angular possible
  const $injector = angular.bootstrap(mountpoint, [moduleName]);

  registerPanels({
    uiSettings: deps.core.uiSettings,
    timelionPanels: deps.timelionPanels,
    data: deps.plugins.data,
    $rootScope: $injector.get('$rootScope'),
    $compile: $injector.get('$compile'),
  });
  element.appendChild(mountpoint);
  return $injector;
}

function createLocalAngularModule(deps: RenderDeps) {
  createLocalI18nModule();
  createLocalIconModule();
  createLocalTopNavModule(deps.plugins.navigation);

  const dashboardAngularModule = angular.module(moduleName, [
    ...thirdPartyAngularDependencies,
    'app/timelion/TopNav',
    'app/timelion/I18n',
    'app/timelion/icon',
  ]);
  return dashboardAngularModule;
}

function createLocalIconModule() {
  angular
    .module('app/timelion/icon', ['react'])
    .directive('icon', (reactDirective) => reactDirective(EuiIcon));
}

function createLocalTopNavModule(navigation: TimelionPluginDependencies['navigation']) {
  angular
    .module('app/timelion/TopNav', ['react'])
    .directive('kbnTopNav', createTopNavDirective)
    .directive('kbnTopNavHelper', createTopNavHelper(navigation.ui));
}

function createLocalI18nModule() {
  angular
    .module('app/timelion/I18n', [])
    .provider('i18n', I18nProvider)
    .filter('i18n', i18nFilter)
    .directive('i18nId', i18nDirective);
}
