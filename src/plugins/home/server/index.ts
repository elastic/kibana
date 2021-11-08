/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type { HomeServerPluginSetup, HomeServerPluginStart } from './plugin';
export { EmbeddableTypes, TutorialsCategory } from './services';
export type {
  AppLinkData,
  ArtifactsSchema,
  TutorialProvider,
  TutorialSchema,
  InstructionSetSchema,
  InstructionsSchema,
  TutorialContext,
  SampleDatasetProvider,
  SampleDataRegistrySetup,
  SampleDatasetDashboardPanel,
  SampleObject,
  ScopedTutorialContextFactory,
} from './services';
import { PluginInitializerContext, PluginConfigDescriptor } from 'kibana/server';
import { HomeServerPlugin } from './plugin';
import { configSchema, ConfigSchema } from '../config';

export const config: PluginConfigDescriptor<ConfigSchema> = {
  exposeToBrowser: {
    disableWelcomeScreen: true,
  },
  schema: configSchema,
};

export const plugin = (initContext: PluginInitializerContext) => new HomeServerPlugin(initContext);

export { INSTRUCTION_VARIANT } from '../common/instruction_variant';
