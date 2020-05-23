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

import angular, { IModule } from 'angular';
// required for `ngSanitize` angular module
import 'angular-sanitize';
import { i18nDirective, i18nFilter, I18nProvider } from '@kbn/i18n/angular';

import { AppMountContext } from 'kibana/public';
import { NavigationPublicPluginStart as NavigationStart } from 'src/plugins/navigation/public';
import {
  configureAppAngularModule,
  createTopNavDirective,
  createTopNavHelper,
} from '../../../kibana_legacy/public';

// @ts-ignore
import { initVisualizeApp } from './legacy_app';
import { VisualizeKibanaServices } from '../kibana_services';

let angularModuleInstance: IModule | null = null;

export const renderApp = (
  element: HTMLElement,
  appBasePath: string,
  deps: VisualizeKibanaServices
) => {
  if (!angularModuleInstance) {
    angularModuleInstance = createLocalAngularModule(deps.core, deps.navigation);
    // global routing stuff
    configureAppAngularModule(
      angularModuleInstance,
      { core: deps.core, env: deps.pluginInitializerContext.env },
      true
    );
    initVisualizeApp(angularModuleInstance, deps);
  }
  const $injector = mountVisualizeApp(appBasePath, element);
  return () => $injector.get('$rootScope').$destroy();
};

const mainTemplate = (basePath: string) => `<div ng-view class="kbnLocalApplicationWrapper">
  <base href="${basePath}" />
</div>
`;

const moduleName = 'app/visualize';

const thirdPartyAngularDependencies = ['ngSanitize', 'ngRoute', 'react'];

function mountVisualizeApp(appBasePath: string, element: HTMLElement) {
  const mountpoint = document.createElement('div');
  mountpoint.setAttribute('class', 'kbnLocalApplicationWrapper');
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
  createLocalTopNavModule(navigation);

  const visualizeAngularModule: IModule = angular.module(moduleName, [
    ...thirdPartyAngularDependencies,
    'app/visualize/I18n',
    'app/visualize/TopNav',
  ]);
  return visualizeAngularModule;
}

function createLocalTopNavModule(navigation: NavigationStart) {
  angular
    .module('app/visualize/TopNav', ['react'])
    .directive('kbnTopNav', createTopNavDirective)
    .directive('kbnTopNavHelper', createTopNavHelper(navigation.ui));
}

function createLocalI18nModule() {
  angular
    .module('app/visualize/I18n', [])
    .provider('i18n', I18nProvider)
    .filter('i18n', i18nFilter)
    .directive('i18nId', i18nDirective);
}
