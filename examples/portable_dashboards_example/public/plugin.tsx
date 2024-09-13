/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AppMountParameters, CoreSetup, Plugin } from '@kbn/core/public';
import { DashboardStart } from '@kbn/dashboard-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DeveloperExamplesSetup } from '@kbn/developer-examples-plugin/public';
import { EmbeddableSetup } from '@kbn/embeddable-plugin/public';
import type { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';
import { FILTER_DEBUGGER_EMBEDDABLE_ID, PLUGIN_ID } from './constants';
import img from './portable_dashboard_image.png';

interface SetupDeps {
  developerExamples: DeveloperExamplesSetup;
  embeddable: EmbeddableSetup;
}

export interface StartDeps {
  dashboard: DashboardStart;
  data: DataPublicPluginStart;
  navigation: NavigationPublicPluginStart;
}

export class PortableDashboardsExamplePlugin implements Plugin<void, void, SetupDeps, StartDeps> {
  public setup(core: CoreSetup<StartDeps>, { developerExamples, embeddable }: SetupDeps) {
    core.application.register({
      id: PLUGIN_ID,
      title: 'Portable dashboard examples',
      visibleIn: [],
      async mount(params: AppMountParameters) {
        const [coreStart, depsStart] = await core.getStartServices();
        const { renderApp } = await import('./app');
        return renderApp(coreStart, depsStart, params);
      },
    });

    developerExamples.register({
      appId: PLUGIN_ID,
      title: 'Portable Dashboards',
      description: `Showcases different ways to embed a dashboard into your app`,
      image: img,
    });

    embeddable.registerReactEmbeddableFactory(FILTER_DEBUGGER_EMBEDDABLE_ID, async () => {
      const { factory } = await import('./filter_debugger_embeddable');
      return factory;
    });
  }

  public async start() {}

  public stop() {}
}
