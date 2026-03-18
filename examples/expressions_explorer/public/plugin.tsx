/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Plugin, CoreSetup, AppMountParameters } from '@kbn/core/public';
import type { DeveloperExamplesSetup } from '@kbn/developer-examples-plugin/public';
import type { ExpressionsSetup, ExpressionsStart } from '@kbn/expressions-plugin/public';
import type {
  Setup as InspectorSetup,
  Start as InspectorStart,
} from '@kbn/inspector-plugin/public';
import type { UiActionsStart, UiActionsSetup } from '@kbn/ui-actions-plugin/public';
import { getExpressionsInspectorViewDescription } from './inspector';
import { getButtonRenderer } from './renderers/button';
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

    // register custom functions and renderers
    deps.expressions.registerRenderer(getButtonRenderer(core));
    deps.expressions.registerFunction(buttonFn);

    core.application.register({
      id: 'expressionsExplorer',
      title: 'Expressions Explorer',
      visibleIn: [],
      async mount(params: AppMountParameters) {
        const [coreStart, depsStart] = await core.getStartServices();
        const { renderApp } = await import('./app');
        return renderApp(
          {
            expressions: depsStart.expressions,
            inspector: depsStart.inspector,
            actions: depsStart.uiActions,
            uiSettings: core.uiSettings,
            userProfile: coreStart.userProfile,
            settings: core.settings,
            theme: coreStart.theme,
            i18n: coreStart.i18n,
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
          href: 'https://github.com/elastic/kibana/blob/main/src/platform/plugins/shared/expressions/README.asciidoc',
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
