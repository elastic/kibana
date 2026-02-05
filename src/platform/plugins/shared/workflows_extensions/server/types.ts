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
import type { TriggerDefinition } from '../common';
import type { ServerStepDefinition } from './step_registry/types';
import type { WorkflowsExtensionsStartContract } from '../common/types';

/**
 * Server-side plugin setup contract.
 * Exposes methods for other plugins to register server-side custom workflow steps and triggers.
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

  /**
   * Register a workflow trigger definition.
   * This should be called during the plugin's setup phase.
   *
   * @param definition - The trigger definition
   * @throws Error if trigger id is already registered, validation fails, or registration is attempted after setup
   */
  registerTrigger(definition: TriggerDefinition): void;
}

/**
 * Server-side trigger API exposed on the workflows extensions start contract.
 * Exposes methods for retrieving registered trigger definitions.
 */
export interface WorkflowsExtensionsTriggerStartContract {
  /**
   * Get definition for a specific trigger id.
   * @param triggerId - The trigger identifier
   * @returns The trigger definition, or undefined if not found
   */
  getTrigger(triggerId: string): TriggerDefinition | undefined;
  /**
   * Check if definition for a trigger id is registered.
   * @param triggerId - The trigger identifier
   * @returns True if definition for the trigger id is registered, false otherwise
   */
  hasTrigger(triggerId: string): boolean;
  /**
   * Get all registered trigger definitions.
   * @returns Array of all registered trigger definitions
   */
  listTriggers(): TriggerDefinition[];
}

/**
 * Server-side plugin start contract.
 * Exposes methods for retrieving registered server-side step implementations and trigger definitions.
 */
export type WorkflowsExtensionsServerPluginStart =
  WorkflowsExtensionsStartContract<ServerStepDefinition> & WorkflowsExtensionsTriggerStartContract;

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
