/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import './index.scss';
import { renderApp as renderReactApp } from './index';

/**
 * Here's where Discover's inner angular is mounted and rendered
 */
export async function renderApp(moduleName: string, element: HTMLElement) {
  await import('./angular');
  const app = mountDiscoverApp(moduleName, element);
  return () => {
    app();
  };
}

function mountDiscoverApp(moduleName: string, element: HTMLElement) {
  const mountpoint = document.createElement('div');
  const appWrapper = document.createElement('div');
  appWrapper.setAttribute('ng-view', '');
  mountpoint.appendChild(appWrapper);
  // @ts-expect-error
  const app = renderReactApp({ element: appWrapper });
  element.appendChild(mountpoint);
  return app;
}
