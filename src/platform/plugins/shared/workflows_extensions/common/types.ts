/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CommonStepDefinition } from './step_registry/types';

/**
 * Exposes methods for other plugins to register step UI definition.
 */
export interface WorkflowsExtensionsSetupContract<TStepDefinition extends CommonStepDefinition> {
  /**
   * Register user-facing definition for a workflow step.
   * This should be called during the plugin's setup phase.
   *
   * @param definition - The step definition containing label, description, and icon
   * @throws Error if definition for the same step type ID is already registered
   */
  registerStepDefinition(definition: TStepDefinition): void;
}

/**
 * Public-side plugin start contract.
 * Exposes methods for retrieving registered step definition.
 */
export interface WorkflowsExtensionsStartContract<TStepDefinition extends CommonStepDefinition> {
  /**
   * Get all registered step definition.
   * @returns Array of all registered step definition
   */
  getAllStepDefinitions(): TStepDefinition[];

  /**
   * Get definition for a specific step type.
   * @param stepTypeId - The step type identifier
   * @returns The step definition, or undefined if not found
   */
  getStepDefinition(stepTypeId: string): TStepDefinition | undefined;

  /**
   * Check if definition for a step type is registered.
   * @param stepTypeId - The step type identifier
   * @returns True if definition for the step type is registered, false otherwise
   */
  hasStepDefinition(stepTypeId: string): boolean;
}
