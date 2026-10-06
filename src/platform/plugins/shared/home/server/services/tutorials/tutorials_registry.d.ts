/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup, CoreStart, PluginInitializerContext } from '@kbn/core/server';
import type { CustomIntegrationsPluginSetup } from '@kbn/custom-integrations-plugin/server';
import type {
  TutorialProvider,
  ScopedTutorialContextFactory,
} from './lib/tutorials_registry_types';
export declare class TutorialsRegistry {
  private readonly initContext;
  private tutorialProviders;
  private readonly scopedTutorialContextFactories;
  private staticAssets;
  private readonly isServerless;
  constructor(initContext: PluginInitializerContext);
  setup(
    core: CoreSetup,
    customIntegrations?: CustomIntegrationsPluginSetup
  ): {
    registerTutorial: (specProvider: TutorialProvider) => void;
    unregisterTutorial: (specProvider: TutorialProvider) => void;
    addScopedTutorialContextFactory: (
      scopedTutorialContextFactory: ScopedTutorialContextFactory
    ) => void;
  };
  start(core: CoreStart, customIntegrations?: CustomIntegrationsPluginSetup): {};
  private get baseTutorialContext();
}
/** @public */
export type TutorialsRegistrySetup = ReturnType<TutorialsRegistry['setup']>;
/** @public */
export type TutorialsRegistryStart = ReturnType<TutorialsRegistry['start']>;
