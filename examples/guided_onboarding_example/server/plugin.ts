/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, Logger, Plugin, PluginInitializerContext } from '@kbn/core/server';
import { testGuideConfig, testGuideId } from '@kbn/guided-onboarding';
import { GuidedOnboardingPluginSetup } from '@kbn/guided-onboarding-plugin/server';

interface PluginsSetup {
  guidedOnboarding?: GuidedOnboardingPluginSetup;
}

export class GuidedOnboardingExamplePlugin implements Plugin {
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(coreSetup: CoreSetup, { guidedOnboarding }: PluginsSetup) {
    this.logger.debug('guidedOnboardingExample: Setup');
    guidedOnboarding?.registerGuideConfig(testGuideId, testGuideConfig);
    return {};
  }

  public start() {
    this.logger.debug('guidedOnboardingExample: Started');
    return {};
  }

  public stop() {}
}
