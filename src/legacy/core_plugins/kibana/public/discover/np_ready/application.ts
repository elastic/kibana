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

import angular from 'angular';

/**
 * Here's where Discover's inner angular is mounted and rendered
 */
export async function renderApp(moduleName: string, element: HTMLElement) {
  await import('./angular');
  const $injector = mountDiscoverApp(moduleName, element);
  return () => $injector.get('$rootScope').$destroy();
}

function mountDiscoverApp(moduleName: string, element: HTMLElement) {
  const mountpoint = document.createElement('div');
  const appWrapper = document.createElement('div');
  appWrapper.setAttribute('ng-view', '');
  mountpoint.appendChild(appWrapper);
  // bootstrap angular into detached element and attach it later to
  // make angular-within-angular possible
  const $injector = angular.bootstrap(mountpoint, [moduleName]);
  // initialize global state handler
  $injector.get('globalState');
  element.appendChild(mountpoint);
  return $injector;
}
