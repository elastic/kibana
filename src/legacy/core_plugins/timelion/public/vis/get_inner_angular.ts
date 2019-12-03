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
import { i18nDirective, i18nFilter, I18nProvider } from '@kbn/i18n/angular';
import { CoreStart, LegacyCoreStart } from 'kibana/public';
import {
  watchMultiDecorator,
  KbnAccessibleClickProvider,
  configureAppAngularModule,
} from './legacy_imports';

const thirdPartyAngularDependencies = ['ngSanitize', 'ui.bootstrap'];

export function getAngularModule(name: string, core: CoreStart) {
  const uiModule = getInnerAngular(name, core);
  configureAppAngularModule(uiModule, core as LegacyCoreStart, true);
  return uiModule;
}

let initialized = false;

export function getInnerAngular(name = 'kibana/timelion_vis', core: CoreStart) {
  if (!initialized) {
    createLocalI18nModule();
    initialized = true;
  }
  return angular
    .module(name, [...thirdPartyAngularDependencies, 'timelionVisI18n'])
    .config(watchMultiDecorator)
    .directive('kbnAccessibleClick', KbnAccessibleClickProvider);
}

function createLocalI18nModule() {
  angular
    .module('timelionVisI18n', [])
    .provider('i18n', I18nProvider)
    .filter('i18n', i18nFilter)
    .directive('i18nId', i18nDirective);
}
