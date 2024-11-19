/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AppMountParameters, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { AppPluginSetupDependencies } from './types';
import { PLUGIN_NAME } from '../common';

export class FeatureFlagsExamplePlugin implements Plugin {
  public setup(core: CoreSetup, deps: AppPluginSetupDependencies) {
    // Register an application into the side navigation menu
    core.application.register({
      id: 'featureFlagsExample',
      title: PLUGIN_NAME,
      async mount(params: AppMountParameters) {
        // Load application bundle
        const { renderApp } = await import('./application');
        // Get start services as specified in kibana.json
        const [coreStart] = await core.getStartServices();
        // Render the application
        return renderApp(coreStart, params);
      },
    });

    deps.developerExamples.register({
      appId: 'featureFlagsExample',
      title: PLUGIN_NAME,
      description: 'Plugin that shows how to make use of the feature flags core service.',
    });
  }

  public start(core: CoreStart) {}

  public stop() {}
}
