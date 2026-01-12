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
import type { DeveloperExamplesSetup } from '@kbn/developer-examples-plugin/public';
import { counterAppId, getCounterStateSchema } from './counter_app';
import { tabSelectionAppId, getTabSelectionStateSchema } from './tab_selection_app';
import { textInputAppId, getTextInputStateSchema } from './text_input_app';

interface SetupDeps {
  developerExamples: DeveloperExamplesSetup;
}

export class SidebarExamplesPlugin implements Plugin<void, void, SetupDeps> {
  public setup(core: CoreSetup, deps: SetupDeps) {
    debugger;
    core.chrome.sidebar.registerApp({
      appId: textInputAppId,
      iconType: 'editorAlignLeft',
      title: 'Text Input Example',
      getStateSchema: getTextInputStateSchema,
      loadComponent: () => import('./text_input_app').then((m) => m.TextInputApp),
    });

    core.chrome.sidebar.registerApp({
      appId: counterAppId,
      iconType: 'number',
      title: 'Counter Example',
      getStateSchema: getCounterStateSchema,
      loadComponent: () => import('./counter_app').then((m) => m.CounterApp),
    });

    core.chrome.sidebar.registerApp({
      appId: tabSelectionAppId,
      iconType: 'documents',
      title: 'Tab Selection Example',
      getStateSchema: getTabSelectionStateSchema,
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
    return {};
  }

  public stop() {}
}
