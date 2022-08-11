/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AppMountParameters, AppNavLinkStatus, CoreSetup, Plugin } from '@kbn/core/public';
import { DashboardStart } from '@kbn/dashboard-plugin/public';
import { DeveloperExamplesSetup } from '@kbn/developer-examples-plugin/public';
import { EmbeddableExamplesStart } from '@kbn/embeddable-examples-plugin/public/plugin';

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
        const [coreStart, depsStart] = await core.getStartServices();
        const { renderApp } = await import('./app');
        await depsStart.embeddableExamples.createSampleData();
        return renderApp(
          {
            basename: params.appBasePath,
            DashboardContainerByValueRenderer:
              depsStart.dashboard.getDashboardContainerByValueRenderer(),
            uiSettings: coreStart.uiSettings,
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
