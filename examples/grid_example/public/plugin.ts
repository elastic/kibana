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
import { UiActionsStart } from '@kbn/ui-actions-plugin/public';

export const GRID_EXAMPLE_APP_ID = 'gridExample';
const gridExampleTitle = 'Grid Example';

interface GridExamplePluginSetupDependencies {
  developerExamples: DeveloperExamplesSetup;
}

export interface GridExamplePluginStartDependencies {
  uiActions: UiActionsStart;
}

export class GridExamplePlugin
  implements
    Plugin<void, void, GridExamplePluginSetupDependencies, GridExamplePluginStartDependencies>
{
  public setup(
    core: CoreSetup<GridExamplePluginStartDependencies>,
    { developerExamples }: GridExamplePluginSetupDependencies
  ) {
    core.application.register({
      id: GRID_EXAMPLE_APP_ID,
      title: gridExampleTitle,
      visibleIn: [],
      async mount(params: AppMountParameters) {
        const [{ renderGridExampleApp }, [coreStart, deps]] = await Promise.all([
          import('./app'),
          core.getStartServices(),
        ]);
        return renderGridExampleApp(params.element, { coreStart, uiActions: deps.uiActions });
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
