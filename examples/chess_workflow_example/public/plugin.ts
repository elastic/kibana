/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AppMountParameters, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { DeveloperExamplesSetup } from '@kbn/developer-examples-plugin/public';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ChessWorkflowExamplePluginSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ChessWorkflowExamplePluginStart {}

export interface ChessWorkflowExamplePluginSetupDeps {
  developerExamples: DeveloperExamplesSetup;
}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ChessWorkflowExamplePluginStartDeps {}

export class ChessWorkflowExamplePlugin
  implements
    Plugin<
      ChessWorkflowExamplePluginSetup,
      ChessWorkflowExamplePluginStart,
      ChessWorkflowExamplePluginSetupDeps,
      ChessWorkflowExamplePluginStartDeps
    >
{
  public setup(
    core: CoreSetup<ChessWorkflowExamplePluginStartDeps>,
    plugins: ChessWorkflowExamplePluginSetupDeps
  ): ChessWorkflowExamplePluginSetup {
    core.application.register({
      id: 'chessWorkflowExample',
      title: 'Chess Workflow Example',
      visibleIn: [],
      mount: async (params: AppMountParameters) => {
        const { renderApp } = await import('./application');
        const [coreStart] = await core.getStartServices();
        return renderApp(coreStart, params);
      },
    });

    plugins.developerExamples.register({
      appId: 'chessWorkflowExample',
      title: 'Chess Workflow Example',
      description:
        'Demonstrates human-in-the-loop workflows using the waitForInput step with a chess game.',
      links: [
        {
          label: 'Plan',
          href: 'https://github.com/elastic/kibana/blob/main/examples/chess_workflow_example/README.md',
          iconType: 'documentation',
          target: '_blank',
          size: 's',
        },
      ],
    });

    return {};
  }

  public start(_core: CoreStart, _plugins: ChessWorkflowExamplePluginStartDeps): ChessWorkflowExamplePluginStart {
    return {};
  }

  public stop() {}
}
