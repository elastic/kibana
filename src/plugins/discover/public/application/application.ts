/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import './index.scss';
import angular from 'angular';
import { getServices } from '../kibana_services';

/**
 * Here's where Discover's inner angular is mounted and rendered
 */
export async function renderApp(moduleName: string, element: HTMLElement) {
  // do not wait for fontawesome
  getServices().kibanaLegacy.loadFontAwesome();
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
  element.appendChild(mountpoint);
  return $injector;
}
