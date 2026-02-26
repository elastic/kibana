/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PluginInitializerContext } from '@kbn/core/server';
export { config } from './config';

// This exports static code and TypeScript types,
// as well as, Kibana Platform `plugin()` initializer.

export async function plugin(initializerContext: PluginInitializerContext) {
  const { WorkflowsExtensionsServerPlugin } = await import('./plugin');
  return new WorkflowsExtensionsServerPlugin(initializerContext);
}

export type {
  ServerTriggerDefinition,
  WorkflowsExtensionsServerPluginSetup,
  WorkflowsExtensionsServerPluginStart,
  WorkflowsExtensionsServerPluginSetupDeps,
  WorkflowsExtensionsServerPluginStartDeps,
} from './types';

export type {
  ServerStepDefinition,
  StepHandler,
  StepHandlerContext,
  StepHandlerResult,
} from './step_registry/types';

export { createServerStepDefinition } from './step_registry/types';

export { TriggerRegistry } from './trigger_registry';
