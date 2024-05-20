/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, Plugin, AppMountParameters, DEFAULT_APP_CATEGORIES } from '@kbn/core/public';

import { ExampleDefinition } from './types';

export interface DeveloperExamplesSetup {
  register: (def: ExampleDefinition) => void;
}

export class DeveloperExamplesPlugin implements Plugin<DeveloperExamplesSetup, void> {
  private examplesRegistry: ExampleDefinition[] = [];

  public setup(core: CoreSetup) {
    const examples = this.examplesRegistry;
    core.application.register({
      id: 'developerExamples',
      title: 'Developer examples',
      order: -2000,
      category: DEFAULT_APP_CATEGORIES.kibana,
      async mount(params: AppMountParameters) {
        const { renderApp } = await import('./app');
        const [coreStart] = await core.getStartServices();
        return renderApp(
          {
            examples,
            navigateToApp: (appId: string) => coreStart.application.navigateToApp(appId),
            getUrlForApp: (appId: string) => coreStart.application.getUrlForApp(appId),
          },
          params.element
        );
      },
    });

    const api: DeveloperExamplesSetup = {
      register: (def) => {
        this.examplesRegistry.push(def);
      },
    };
    return api;
  }

  public start() {}

  public stop() {}
}
