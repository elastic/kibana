/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// provided to other plugins as APIs
// should model the plugin lifecycle

export { TutorialsRegistry } from './tutorials';
export type { TutorialsRegistrySetup, TutorialsRegistryStart } from './tutorials';

export { TutorialsCategory } from './tutorials';

export type {
  InstructionSetSchema,
  ParamsSchema,
  InstructionsSchema,
  DashboardSchema,
  ArtifactsSchema,
  TutorialSchema,
  TutorialProvider,
  TutorialContextFactory,
  ScopedTutorialContextFactory,
} from './tutorials';

export { SampleDataRegistry } from './sample_data';

export type { SampleDataRegistrySetup, SampleDataRegistryStart } from './sample_data';

export type { SampleDatasetSchema, SampleDatasetProvider } from './sample_data';
