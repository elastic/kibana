/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  AppMountParameters,
  CoreSetup,
  CoreStart,
  Plugin,
  AppNavLinkStatus,
} from '@kbn/core/public';
import { AppPluginSetupDependencies, AppPluginStartDependencies } from './types';
import { MetricsTracking } from './services';
import { PLUGIN_NAME } from '../common';

export class ScreenshotModeExamplePlugin implements Plugin<void, void> {
  uiTracking = new MetricsTracking();

  public setup(core: CoreSetup, depsSetup: AppPluginSetupDependencies): void {
    const { screenshotMode, usageCollection, developerExamples } = depsSetup;
    const isScreenshotMode = screenshotMode.isScreenshotMode();

    this.uiTracking.setup({
      disableTracking: isScreenshotMode, // In screenshot mode there will be no user interactions to track
      usageCollection,
    });

    // Register an application into the side navigation menu
    core.application.register({
      id: 'screenshotModeExample',
      title: PLUGIN_NAME,
      navLinkStatus: AppNavLinkStatus.hidden,
      async mount(params: AppMountParameters) {
        // Load application bundle
        const { renderApp } = await import('./application');
        // Get start services as specified in kibana.json
        const [coreStart, depsStart] = await core.getStartServices();

        // For screenshots we don't need to have the top bar visible
        coreStart.chrome.setIsVisible(!isScreenshotMode);

        // Render the application
        return renderApp(coreStart, depsSetup, depsStart as AppPluginStartDependencies, params);
      },
    });

    developerExamples.register({
      appId: 'screenshotModeExample',
      title: 'Screenshot mode integration',
      description:
        'Demonstrate how a plugin can adapt appearance based on whether we are in screenshot mode',
    });
  }

  public start(core: CoreStart): void {}

  public stop() {}
}
