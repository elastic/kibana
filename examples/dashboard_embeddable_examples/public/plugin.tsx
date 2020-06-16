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

import { AppMountParameters, AppNavLinkStatus, CoreSetup, Plugin } from '../../../src/core/public';
import { DashboardStart } from '../../../src/plugins/dashboard/public';
import { DeveloperExamplesSetup } from '../../developer_examples/public';
import { EmbeddableExamplesStart } from '../../embeddable_examples/public/plugin';

interface SetupDeps {
  developerExamples: DeveloperExamplesSetup;
}

interface StartDeps {
  dashboard: DashboardStart;
  embeddableExamples: EmbeddableExamplesStart;
}

export class DashboardEmbeddableExamples implements Plugin<void, void, {}, StartDeps> {
  public setup(core: CoreSetup<StartDeps>, { developerExamples }: SetupDeps) {
    core.application.register({
      id: 'dashboardEmbeddableExamples',
      title: 'Dashboard embeddable examples',
      navLinkStatus: AppNavLinkStatus.hidden,
      async mount(params: AppMountParameters) {
        const [, depsStart] = await core.getStartServices();
        const { renderApp } = await import('./app');
        await depsStart.embeddableExamples.createSampleData();
        return renderApp(
          {
            basename: params.appBasePath,
            DashboardContainerByValueRenderer:
              depsStart.dashboard.DashboardContainerByValueRenderer,
          },
          params.element
        );
      },
    });

    developerExamples.register({
      appId: 'dashboardEmbeddableExamples',
      title: 'Dashboard Container',
      description: `Showcase different ways how to embed dashboard container into your app`,
    });
  }

  public start() {}
  public stop() {}
}
