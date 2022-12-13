/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginInitializerContext, CoreSetup, Plugin, Logger } from '@kbn/core/server';

import type { GuideId } from '@kbn/guided-onboarding';
import { GuidedOnboardingPluginSetup, GuidedOnboardingPluginStart } from './types';
import { defineRoutes } from './routes';
import { guideStateSavedObjects, pluginStateSavedObjects } from './saved_objects';
import type { GuideConfig, GuidesConfig } from '../common';
import { testGuideConfig, testGuideId } from '../common';

export class GuidedOnboardingPlugin
  implements Plugin<GuidedOnboardingPluginSetup, GuidedOnboardingPluginStart>
{
  private readonly logger: Logger;
  private readonly guidesConfig: GuidesConfig;
  private readonly isDevMode: boolean;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.guidesConfig = {} as GuidesConfig;
    this.isDevMode = initializerContext.env.mode.dev;
  }

  public setup(core: CoreSetup) {
    this.logger.debug('guidedOnboarding: Setup');
    const router = core.http.createRouter();

    // Register server side APIs
    defineRoutes(router, this.guidesConfig);

    // register saved objects
    core.savedObjects.registerType(guideStateSavedObjects);
    core.savedObjects.registerType(pluginStateSavedObjects);

    // add a config for a test guide if running in dev mode
    if (this.isDevMode) {
      this.guidesConfig[testGuideId] = testGuideConfig;
    }
    return {
      registerGuideConfig: (guideId: GuideId, guideConfig: GuideConfig) => {
        if (this.guidesConfig[guideId]) {
          throw new Error(
            `Unable to register a config with the guideId ${guideId} because it already exists`
          );
        }
        this.guidesConfig[guideId] = guideConfig;
      },
    };
  }

  public start() {
    this.logger.debug('guidedOnboarding: Started');
    return {};
  }

  public stop() {}
}
