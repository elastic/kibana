/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginInitializerContext, CoreSetup, Plugin, Logger } from '@kbn/core/server';

import type { GuideId, GuideConfig } from '@kbn/guided-onboarding';
import { GuidedOnboardingPluginSetup, GuidedOnboardingPluginStart } from './types';
import { defineRoutes } from './routes';
import { guideStateSavedObjects, pluginStateSavedObjects } from './saved_objects';
import type { GuidesConfig } from '../common';

export class GuidedOnboardingPlugin
  implements Plugin<GuidedOnboardingPluginSetup, GuidedOnboardingPluginStart>
{
  private readonly logger: Logger;
  private readonly guidesConfig: GuidesConfig;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.guidesConfig = {} as GuidesConfig;
  }

  public setup(core: CoreSetup) {
    this.logger.debug('guidedOnboarding: Setup');
    const router = core.http.createRouter();

    // Register server side APIs
    defineRoutes(router, this.guidesConfig);

    // register saved objects
    core.savedObjects.registerType(guideStateSavedObjects);
    core.savedObjects.registerType(pluginStateSavedObjects);

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
