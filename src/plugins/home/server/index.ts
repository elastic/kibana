/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type { HomeServerPluginSetup, HomeServerPluginStart } from './plugin';
export type { TutorialProvider } from './services';
export type { SampleDatasetProvider, SampleDataRegistrySetup } from './services';
import { PluginInitializerContext, PluginConfigDescriptor } from 'kibana/server';
import { HomeServerPlugin } from './plugin';
import { configSchema, ConfigSchema } from '../config';

export const config: PluginConfigDescriptor<ConfigSchema> = {
  exposeToBrowser: {
    disableWelcomeScreen: true,
  },
  schema: configSchema,
  deprecations: ({ renameFromRoot }) => [
    renameFromRoot('kibana.disableWelcomeScreen', 'home.disableWelcomeScreen'),
  ],
};

export const plugin = (initContext: PluginInitializerContext) => new HomeServerPlugin(initContext);

export { INSTRUCTION_VARIANT } from '../common/instruction_variant';
export { TutorialsCategory } from './services/tutorials';
export type {
  ArtifactsSchema,
  TutorialSchema,
  InstructionSetSchema,
  InstructionsSchema,
} from './services/tutorials';
