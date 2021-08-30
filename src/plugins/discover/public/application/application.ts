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
  const app = mountDiscoverApp(moduleName, element);
  return () => {
    app();
  };
}

function buildDiscoverElement(mountpoint: HTMLElement) {
  // due to legacy angular tags, we need some manual DOM intervention here
  const appWrapper = document.createElement('div');
  const discoverApp = document.createElement('discover-app');
  const discover = document.createElement('discover');
  appWrapper.appendChild(discoverApp);
  discoverApp.append(discover);
  mountpoint.appendChild(appWrapper);
  return discover;
}

function mountDiscoverApp(moduleName: string, element: HTMLElement) {
  const mountpoint = document.createElement('div');
  const discoverElement = buildDiscoverElement(mountpoint);
  // @ts-expect-error
  const app = renderReactApp({ element: discoverElement });
  element.appendChild(mountpoint);
  return app;
}
