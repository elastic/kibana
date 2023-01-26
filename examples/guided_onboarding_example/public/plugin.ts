/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AppMountParameters, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import {
  GuidedOnboardingExamplePluginSetup,
  GuidedOnboardingExamplePluginStart,
  AppPluginStartDependencies,
} from './types';
import { PLUGIN_NAME } from '../common';

export class GuidedOnboardingExamplePlugin
  implements Plugin<GuidedOnboardingExamplePluginSetup, GuidedOnboardingExamplePluginStart>
{
  public setup(core: CoreSetup): GuidedOnboardingExamplePluginSetup {
    // Register an application into the side navigation menu
    core.application.register({
      id: 'guidedOnboardingExample',
      title: PLUGIN_NAME,
      async mount(params: AppMountParameters) {
        // Load application bundle
        const { renderApp } = await import('./application');
        // Get start services as specified in kibana.json
        const [coreStart, depsStart] = await core.getStartServices();
        // Render the application
        return renderApp(coreStart, depsStart as AppPluginStartDependencies, params);
      },
    });

    return {};
  }

  public start(core: CoreStart): GuidedOnboardingExamplePluginStart {
    return {};
  }

  public stop() {}
}
