/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { CustomIntegrationsPluginSetup } from '@kbn/custom-integrations-plugin/server';
import type {
  TutorialsRegistrySetup,
  TutorialsRegistryStart,
  SampleDataRegistrySetup,
  SampleDataRegistryStart,
} from './services';
export interface HomeServerPluginSetupDependencies {
  usageCollection?: UsageCollectionSetup;
  customIntegrations?: CustomIntegrationsPluginSetup;
}
export declare class HomeServerPlugin
  implements Plugin<HomeServerPluginSetup, HomeServerPluginStart>
{
  private readonly initContext;
  private readonly tutorialsRegistry;
  private readonly sampleDataRegistry;
  private customIntegrations?;
  private readonly isDevMode;
  constructor(initContext: PluginInitializerContext);
  setup(core: CoreSetup, plugins: HomeServerPluginSetupDependencies): HomeServerPluginSetup;
  start(core: CoreStart): HomeServerPluginStart;
}
/** @public */
export interface HomeServerPluginSetup {
  tutorials: TutorialsRegistrySetup;
  sampleData: SampleDataRegistrySetup;
}
/** @public */
export interface HomeServerPluginStart {
  tutorials: TutorialsRegistryStart;
  sampleData: SampleDataRegistryStart;
}
