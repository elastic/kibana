/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export { HomeServerPluginSetup, HomeServerPluginStart } from './plugin';
export { TutorialProvider } from './services';
export { SampleDatasetProvider, SampleDataRegistrySetup } from './services';
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
export { ArtifactsSchema, TutorialsCategory } from './services/tutorials';
