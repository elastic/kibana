/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PluginStartContract as ActionsPluginStartContract } from '@kbn/actions-plugin/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { ServerStepDefinition } from './step_registry/types';
import type { WorkflowsExtensionsStartContract } from '../common/types';

/**
 * Server-side plugin setup contract.
 * Exposes methods for other plugins to register server-side custom workflow steps.
 */
export interface WorkflowsExtensionsServerPluginSetup {
  /**
   * Register server-side definition for a workflow step.
   * This should be called during the plugin's setup phase.
   *
   * @param definition - The step server-side definition
   * @throws Error if definition for the same step type ID is already registered
   */
  registerStepDefinition(definition: ServerStepDefinition): void;
}

/**
 * Server-side plugin start contract.
 * Exposes methods for retrieving registered server-side step implementations.
 */
export type WorkflowsExtensionsServerPluginStart =
  WorkflowsExtensionsStartContract<ServerStepDefinition>;

/**
 * Dependencies for the server plugin setup phase.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface WorkflowsExtensionsServerPluginSetupDeps {}

/**
 * Dependencies for the server plugin start phase.
 */
export interface WorkflowsExtensionsServerPluginStartDeps {
  actions: ActionsPluginStartContract;
  inference: InferenceServerStart;
}
