/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiIconType } from '@elastic/eui/src/components/icon/icon';
import type { CommonStepDefinition } from '../common';

/**
 * Documentation information for a workflow step.
 */
export interface StepDocumentation {
  /**
   * Brief summary of what the step does.
   */
  summary: string;

  /**
   * Detailed description of the step's functionality, use cases, and behavior.
   */
  details?: string;

  /**
   * Example usage scenarios or code snippets.
   */
  examples?: string[];
}

/**
 * User-facing metadata for a workflow step.
 * This is used by the UI to display step information (label, description, icon, schemas, documentation).
 */
export interface StepMetadata extends CommonStepDefinition {
  /**
   * User-facing label/title for this step type.
   * Displayed in the UI when selecting or viewing steps.
   */
  label: string;

  /**
   * User-facing description of what this step does.
   * Displayed as help text or in tooltips.
   */
  description?: string;

  /**
   * Icon type from EUI icon library.
   * Used to visually represent this step type in the UI.
   */
  icon: EuiIconType;

  /**
   * Documentation for the step, including summary, details, and examples.
   */
  documentation: StepDocumentation;
}

/**
 * Public-side plugin setup contract.
 * Exposes methods for other plugins to register step UI metadata.
 */
export interface WorkflowsExtensionsPublicPluginSetup {
  /**
   * Register user-facing metadata for a workflow step.
   * This should be called during the plugin's setup phase.
   *
   * @param metadata - The step metadata containing label, description, and icon
   * @throws Error if metadata for the same step type ID is already registered
   */
  registerStepMetadata(metadata: StepMetadata): void;
}

/**
 * Public-side plugin start contract.
 * Exposes methods for retrieving registered step metadata.
 */
export interface WorkflowsExtensionsPublicPluginStart {
  /**
   * Get all registered step metadata.
   * @returns Array of all registered step metadata
   */
  getRegisteredSteps(): StepMetadata[];

  /**
   * Get metadata for a specific step type.
   * @param stepTypeId - The step type identifier
   * @returns The step metadata, or undefined if not found
   */
  getStepMetadata(stepTypeId: string): StepMetadata | undefined;

  /**
   * Check if metadata for a step type is registered.
   * @param stepTypeId - The step type identifier
   * @returns True if metadata for the step type is registered, false otherwise
   */
  hasStepMetadata(stepTypeId: string): boolean;
}

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
