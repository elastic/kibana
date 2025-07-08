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
import { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';

const PLUGIN_NAME = 'GlobalFlyoutOrchestratorExample';

interface StartDeps {
  navigation: NavigationPublicPluginStart;
}
interface SetupDeps {
  developerExamples: DeveloperExamplesSetup;
}

export class GlobalFlyoutOrchestratorExamplePlugin
  implements Plugin<void, void, SetupDeps, StartDeps>
{
  public setup(core: CoreSetup<StartDeps>, deps: SetupDeps): void {
    // Register an application into the side navigation menu
    core.application.register({
      id: 'global_flyout_orchestrator_example',
      title: PLUGIN_NAME,
      async mount(params: AppMountParameters) {
        // Load application bundle
        const { renderApp } = await import('./application');
        // Get start services as specified in kibana.json
        const [coreStart, depsStart] = await core.getStartServices();
        // Render the application
        return renderApp(coreStart, depsStart, params);
      },
    });

    deps.developerExamples.register({
      appId: 'globalFlyoutOrchestratorExample',
      title: 'Global Flyout Orchestrator Example Application',
      description: `Demonstrates the impressive Global Flyout Orchestrator.`,
    });
  }

  public start(_core: CoreStart) {
    return {};
  }

  public stop() {}
}
