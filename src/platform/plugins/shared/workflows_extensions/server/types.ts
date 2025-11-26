/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ServerStepDefinition } from './step_registry/types';

/**
 * Server-side plugin setup contract.
 * Exposes methods for other plugins to register custom workflow steps.
 */
export interface WorkflowsExtensionsServerPluginSetup {
  /**
   * Register a custom workflow step implementation.
   * This should be called during the plugin's setup phase.
   *
   * @param definition - The step definition containing the handler function
   * @throws Error if a step with the same ID is already registered
   */
  registerStep(definition: ServerStepDefinition): void;
}

/**
 * Server-side plugin start contract.
 * Exposes methods for retrieving registered step implementations.
 */
export interface WorkflowsExtensionsServerPluginStart {
  /**
   * Get a step handler for a given step type ID.
   *
   * @param stepTypeId - The step type identifier
   * @returns The step handler function, or undefined if not found
   */
  getStep(stepTypeId: string): ServerStepDefinition | undefined;

  /**
   * Check if a step type is registered.
   *
   * @param stepTypeId - The step type identifier
   * @returns True if the step type is registered, false otherwise
   */
  hasStep(stepTypeId: string): boolean;

  /**
   * Get all registered step type IDs.
   * @returns Array of registered step type identifiers
   */
  getAll(): ServerStepDefinition[];
}

/**
 * Dependencies for the server plugin setup phase.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface WorkflowsExtensionsServerPluginSetupDeps {}

/**
 * Dependencies for the server plugin start phase.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface WorkflowsExtensionsServerPluginStartDeps {}
