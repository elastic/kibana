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
import type { AppMountParameters, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { SidebarAppUpdater } from '@kbn/core-chrome-sidebar';
import type { DeveloperExamplesSetup } from '@kbn/developer-examples-plugin/public';
import { counterAppId } from './counter_app';
import { tabSelectionAppId, tabSelectionStore } from './tab_selection_app';
import { textInputAppId, textInputStore } from './text_input_app';

interface SetupDeps {
  developerExamples: DeveloperExamplesSetup;
}

export class SidebarExamplesPlugin implements Plugin<void, void, SetupDeps> {
  private updateTabSelectionApp?: SidebarAppUpdater;

  public setup(core: CoreSetup, deps: SetupDeps) {
    core.chrome.sidebar.registerApp({
      appId: textInputAppId,
      store: textInputStore,
      loadComponent: () => import('./text_input_app').then((m) => m.TextInputApp),
    });

    core.chrome.sidebar.registerApp({
      appId: counterAppId,
      restoreOnReload: false, // Uses internal React state, not persisted store state
      loadComponent: () => import('./counter_app').then((m) => m.CounterApp),
    });

    // Register tab selection app as initially pending (simulating permission check)
    this.updateTabSelectionApp = core.chrome.sidebar.registerApp({
      appId: tabSelectionAppId,
      status: 'pending', // Initially pending async check
      store: tabSelectionStore,
      loadComponent: () => import('./tab_selection_app').then((m) => m.TabSelectionApp),
    });

    core.application.register({
      id: 'sidebarExamples',
      title: 'Sidebar Examples',
      async mount({ element }: AppMountParameters) {
        const [coreStart] = await core.getStartServices();
        const { App } = await import('./app');

        ReactDOM.render(coreStart.rendering.addContext(<App />), element);
        return () => ReactDOM.unmountComponentAtNode(element);
      },
    });

    deps.developerExamples.register({
      appId: 'sidebarExamples',
      title: 'Sidebar System Examples',
      description: 'Demonstrates sidebar app registration and basic interaction',
    });
  }

  public start(core: CoreStart) {
    // Simulate async permission check - make tab selection app available after 2 seconds
    setTimeout(() => {
      this.updateTabSelectionApp?.({ status: 'available' });
      // eslint-disable-next-line no-console
      console.log('[Sidebar Example] Tab Selection app is now available after permission check');
    }, 2000);

    return {};
  }

  public stop() {}
}
