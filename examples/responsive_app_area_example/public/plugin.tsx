/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import ReactDOM from 'react-dom';
import type { AppMountParameters, CoreSetup, Plugin } from '@kbn/core/public';
import type { DeveloperExamplesSetup } from '@kbn/developer-examples-plugin/public';
import { sidebarAppId } from './sidebar_app';

interface SetupDeps {
  developerExamples: DeveloperExamplesSetup;
}

export class ResponsiveAppAreaExamplePlugin implements Plugin<void, void, SetupDeps> {
  public setup(core: CoreSetup, { developerExamples }: SetupDeps) {
    core.chrome.sidebar.registerApp({
      appId: sidebarAppId,
      restoreOnReload: false,
      loadComponent: () => import('./sidebar_app').then(({ SidebarApp }) => SidebarApp),
    });

    core.application.register({
      id: 'responsiveAppAreaExample',
      title: 'Responsive app area',
      async mount({ element }: AppMountParameters) {
        const [coreStart] = await core.getStartServices();
        const { App } = await import('./app');

        ReactDOM.render(
          coreStart.rendering.addContext(<App rendering={coreStart.rendering} />, {
            mountElement: element,
          }),
          element
        );
        return () => ReactDOM.unmountComponentAtNode(element);
      },
    });

    developerExamples.register({
      appId: 'responsiveAppAreaExample',
      title: 'Responsive app area',
      description:
        'EUI breakpoints that follow the app area instead of the window, so pages adapt when the sidebar opens',
    });
  }

  public start() {}

  public stop() {}
}
