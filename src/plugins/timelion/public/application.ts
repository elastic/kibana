/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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

import { configureAppAngularModule } from '../../kibana_legacy/public';
import { TimelionPluginStartDependencies } from './plugin';
import { DataPublicPluginStart } from '../../data/public';
// @ts-ignore
import { initTimelionApp } from './app';

export interface RenderDeps {
  pluginInitializerContext: PluginInitializerContext;
  mountParams: AppMountParameters;
  core: CoreStart;
  plugins: TimelionPluginStartDependencies;
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
  // eslint-disable-next-line no-unsanitized/property
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

  const dashboardAngularModule = angular.module(moduleName, [
    ...thirdPartyAngularDependencies,
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

function createLocalI18nModule() {
  angular
    .module('app/timelion/I18n', [])
    .provider('i18n', I18nProvider)
    .filter('i18n', i18nFilter)
    .directive('i18nId', i18nDirective);
}
