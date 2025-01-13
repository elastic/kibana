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
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';

export interface SetupDeps {
  developerExamples: DeveloperExamplesSetup;
}

export interface StartDeps {
  data: DataPublicPluginStart;
}

export class UnifiedDocViewerExamplesPlugin implements Plugin<void, void, SetupDeps, StartDeps> {
  public setup(core: CoreSetup<StartDeps>, deps: SetupDeps) {
    // Register an application into the side navigation menu
    core.application.register({
      id: 'unifiedDocViewer',
      title: 'Unified Doc Viewer Examples',
      async mount(params: AppMountParameters) {
        // Load application bundle
        const { renderApp } = await import('./application');
        // Get start services as specified in kibana.json
        const [coreStart, depsStart] = await core.getStartServices();
        // Render the application
        return renderApp(coreStart, depsStart, params);
      },
    });

    // This section is only needed to get this example plugin to show up in our Developer Examples.
    deps.developerExamples.register({
      appId: 'unifiedDocViewer',
      title: 'Unified Doc Viewer Examples',
      description: 'Examples showcasing the unified doc viewer.',
    });
  }

  public start(core: CoreStart) {
    return {};
  }

  public stop() {}
}
