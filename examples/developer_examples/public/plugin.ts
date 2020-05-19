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

import {
  CoreSetup,
  Plugin,
  AppMountParameters,
  DEFAULT_APP_CATEGORIES,
} from '../../../src/core/public';

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
