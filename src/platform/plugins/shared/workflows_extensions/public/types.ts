/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { z } from '@kbn/zod/v4';
import type { PublicStepDefinition } from './step_registry/types';
import type { PublicTriggerDefinition } from './trigger_registry/types';
import type { WorkflowsExtensionsStartContract } from '../common/types';

/**
 * Public-side plugin setup contract.
 * Exposes methods for other plugins to register public-side step and trigger definitions.
 */

export interface WorkflowsExtensionsPublicPluginSetup {
  /**
   * Register user-facing definition for a workflow step.
   * This should be called during the plugin's setup phase.
   *
   * @param definition - The public-side step definition
   * @throws Error if definition for the same step type ID is already registered
   */
  registerStepDefinition<
    Input extends z.ZodType = z.ZodType,
    Output extends z.ZodType = z.ZodType,
    Config extends z.ZodObject = z.ZodObject
  >(
    definition: PublicStepDefinition<Input, Output, Config>
  ): void;

  /**
   * Register user-facing definition for a workflow trigger.
   * This should be called during the plugin's setup phase.
   * Must be paired with server-side registration (registerTrigger) for the same trigger id.
   *
   * @param definition - The public-side trigger definition
   * @throws Error if definition for the same trigger id is already registered
   */
  registerTriggerDefinition<EventSchema extends z.ZodType = z.ZodType>(
    definition: PublicTriggerDefinition<EventSchema>
  ): void;
}

/**
 * Read-only contract for trigger discovery at start.
 */
export interface TriggerRegistryStartContract {
  getAllTriggerDefinitions(): PublicTriggerDefinition[];
  getTriggerDefinition(triggerId: string): PublicTriggerDefinition | undefined;
  hasTriggerDefinition(triggerId: string): boolean;
}

/**
 * Public-side plugin start contract.
 * Exposes methods for retrieving registered step and trigger definitions.
 */
export type WorkflowsExtensionsPublicPluginStart =
  WorkflowsExtensionsStartContract<PublicStepDefinition> & TriggerRegistryStartContract;

/**
 * Dependencies for the public plugin setup phase.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface WorkflowsExtensionsPublicPluginSetupDeps {}

/**
 * Dependencies for the public plugin start phase.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface WorkflowsExtensionsPublicPluginStartDeps {}
