/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export { TutorialsRegistry } from './tutorials_registry';
export type { TutorialsRegistrySetup, TutorialsRegistryStart } from './tutorials_registry';

export { TutorialsCategory } from './lib/tutorials_registry_types';

export type {
  InstructionSetSchema,
  ParamsSchema,
  InstructionsSchema,
  DashboardSchema,
  ArtifactsSchema,
  TutorialSchema,
  TutorialProvider,
  TutorialContext,
  TutorialContextFactory,
  ScopedTutorialContextFactory,
} from './lib/tutorials_registry_types';
