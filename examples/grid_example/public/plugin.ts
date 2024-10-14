/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AppMountParameters, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { DeveloperExamplesSetup } from '@kbn/developer-examples-plugin/public';

export const GRID_EXAMPLE_APP_ID = 'gridExample';
const gridExampleTitle = 'Grid Example';

interface GridExamplePluginSetupDependencies {
  developerExamples: DeveloperExamplesSetup;
}

export class GridExamplePlugin
  implements Plugin<void, void, GridExamplePluginSetupDependencies, {}>
{
  public setup(core: CoreSetup<{}>, { developerExamples }: GridExamplePluginSetupDependencies) {
    core.application.register({
      id: GRID_EXAMPLE_APP_ID,
      title: gridExampleTitle,
      visibleIn: [],
      async mount(params: AppMountParameters) {
        const { renderGridExampleApp } = await import('./app');
        return renderGridExampleApp(params.element);
      },
    });
    developerExamples.register({
      appId: GRID_EXAMPLE_APP_ID,
      title: gridExampleTitle,
      description: `A playground and learning tool that demonstrates the Dashboard layout engine.`,
    });
  }

  public start(core: CoreStart, deps: {}) {}

  public stop() {}
}
