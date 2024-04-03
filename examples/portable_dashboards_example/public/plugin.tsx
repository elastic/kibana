/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AppMountParameters, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { DeveloperExamplesSetup } from '@kbn/developer-examples-plugin/public';
import type { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { DashboardStart } from '@kbn/dashboard-plugin/public';

import img from './portable_dashboard_image.png';
import { PLUGIN_ID } from './constants';

interface SetupDeps {
  developerExamples: DeveloperExamplesSetup;
}

export interface PortableDashboardsExampleStartDeps {
  dashboard: DashboardStart;
  data: DataPublicPluginStart;
  navigation: NavigationPublicPluginStart;
}

export class PortableDashboardsExamplePlugin
  implements Plugin<void, void, SetupDeps, PortableDashboardsExampleStartDeps>
{
  public setup(
    core: CoreSetup<PortableDashboardsExampleStartDeps>,
    { developerExamples }: SetupDeps
  ) {
    core.application.register({
      id: PLUGIN_ID,
      title: 'Portable dashboard examples',
      visibleIn: [],
      async mount(params: AppMountParameters) {
        const [, depsStart] = await core.getStartServices();
        const { renderApp } = await import('./app');
        return renderApp(depsStart, params);
      },
    });

    developerExamples.register({
      appId: PLUGIN_ID,
      title: 'Portable Dashboards',
      description: `Showcases different ways to embed a dashboard into your app`,
      image: img,
    });
  }

  public async start(core: CoreStart, { dashboard }: PortableDashboardsExampleStartDeps) {}

  public stop() {}
}
