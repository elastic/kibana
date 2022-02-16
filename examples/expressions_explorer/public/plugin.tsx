/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Plugin, CoreSetup, AppMountParameters, AppNavLinkStatus } from '../../../src/core/public';
import { DeveloperExamplesSetup } from '../../developer_examples/public';
import { ExpressionsSetup, ExpressionsStart } from '../../../src/plugins/expressions/public';
import {
  Setup as InspectorSetup,
  Start as InspectorStart,
} from '../../../src/plugins/inspector/public';
import { getExpressionsInspectorViewDescription } from './inspector';
import { UiActionsStart, UiActionsSetup } from '../../../src/plugins/ui_actions/public';
import { NAVIGATE_TRIGGER_ID, navigateTrigger } from './actions/navigate_trigger';
import { ACTION_NAVIGATE, createNavigateAction } from './actions/navigate_action';
import { buttonRenderer } from './renderers/button';
import { buttonFn } from './functions/button';

interface StartDeps {
  expressions: ExpressionsStart;
  inspector: InspectorStart;
  uiActions: UiActionsStart;
}

interface SetupDeps {
  uiActions: UiActionsSetup;
  expressions: ExpressionsSetup;
  inspector: InspectorSetup;
  developerExamples: DeveloperExamplesSetup;
}

export class ExpressionsExplorerPlugin implements Plugin<void, void, SetupDeps, StartDeps> {
  public setup(core: CoreSetup<StartDeps>, deps: SetupDeps) {
    // register custom inspector adapter & view
    deps.inspector.registerView(getExpressionsInspectorViewDescription());

    // register custom actions
    deps.uiActions.registerTrigger(navigateTrigger);
    deps.uiActions.registerAction(createNavigateAction());
    deps.uiActions.attachAction(NAVIGATE_TRIGGER_ID, ACTION_NAVIGATE);

    // register custom functions and renderers
    deps.expressions.registerRenderer(buttonRenderer);
    deps.expressions.registerFunction(buttonFn);

    core.application.register({
      id: 'expressionsExplorer',
      title: 'Expressions Explorer',
      navLinkStatus: AppNavLinkStatus.hidden,
      async mount(params: AppMountParameters) {
        const [, depsStart] = await core.getStartServices();
        const { renderApp } = await import('./app');
        return renderApp(
          {
            expressions: depsStart.expressions,
            inspector: depsStart.inspector,
            actions: depsStart.uiActions,
            uiSettings: core.uiSettings,
          },
          params
        );
      },
    });

    deps.developerExamples.register({
      appId: 'expressionsExplorer',
      title: 'Expressions',
      description: `Expressions is a plugin that allows to execute Kibana expressions and render content using expression renderers. This example plugin showcases various usage scenarios.`,
      links: [
        {
          label: 'README',
          href: 'https://github.com/elastic/kibana/blob/main/src/plugins/expressions/README.asciidoc',
          iconType: 'logoGithub',
          size: 's',
          target: '_blank',
        },
      ],
    });
  }

  public start() {}

  public stop() {}
}
