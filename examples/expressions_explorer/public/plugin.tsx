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

import { Plugin, CoreSetup, AppMountParameters, AppNavLinkStatus } from '../../../src/core/public';
import { DeveloperExamplesSetup } from '../../developer_examples/public';
import image from './expressions.png';
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
          },
          params
        );
      },
    });

    deps.developerExamples.register({
      appId: 'expressionsExplorer',
      title: 'Expressions',
      description: `Expressions are ...`,
      image,
      links: [
        {
          label: 'README',
          href: 'https://github.com/elastic/kibana/blob/master/src/plugins/expressions/README.md',
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
