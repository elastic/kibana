/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type {
  PluginConfigDescriptor,
  PluginInitializerContext,
} from '../../../core/server/plugins/types';
import type { ConfigSchema } from '../config';
import { configSchema } from '../config';
import { HomeServerPlugin } from './plugin';

export { INSTRUCTION_VARIANT } from '../common/instruction_variant';
export type { HomeServerPluginSetup, HomeServerPluginStart } from './plugin';
export type { SampleDataRegistrySetup, SampleDatasetProvider, TutorialProvider } from './services';
export { TutorialsCategory } from './services/tutorials';
export type {
  ArtifactsSchema,
  InstructionSetSchema,
  InstructionsSchema,
  TutorialSchema,
} from './services/tutorials';
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
