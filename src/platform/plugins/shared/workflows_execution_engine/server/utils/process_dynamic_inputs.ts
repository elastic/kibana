/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowYaml } from '@kbn/workflows';

/**
 * Process workflow inputs and replace dynamic date placeholders with actual dates.
 * This function resolves __DYNAMIC_*__ placeholders in input values to actual ISO datetime strings.
 *
 * @param definition - Workflow definition containing input definitions
 * @param providedInputs - Optional inputs provided by the user. If provided, these take precedence over defaults.
 * @returns Processed inputs with dynamic placeholders resolved to ISO datetime strings
 */
export function processDynamicInputs(
  definition: WorkflowYaml,
  providedInputs?: Record<string, unknown>
): Record<string, unknown> {
  const inputs: Record<string, unknown> = {};

  if (definition.inputs) {
    definition.inputs.forEach((input) => {
      // Use provided input if available, otherwise use default value
      const inputValue = providedInputs?.[input.name] ?? input.default;

      // Check if the value is a dynamic placeholder
      if (typeof inputValue === 'string') {
        if (inputValue === '__DYNAMIC_24H_AGO__') {
          const dayAgo = new Date();
          dayAgo.setTime(dayAgo.getTime() - 24 * 60 * 60 * 1000);
          inputs[input.name] = dayAgo.toISOString();
        } else if (inputValue === '__DYNAMIC_7D_AGO__') {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setTime(sevenDaysAgo.getTime() - 7 * 24 * 60 * 60 * 1000);
          inputs[input.name] = sevenDaysAgo.toISOString();
        } else if (inputValue === '__DYNAMIC_NOW__') {
          inputs[input.name] = new Date().toISOString();
        } else if (input.name === 'start' && !inputValue) {
          // Default to 24 hours ago for start inputs without a default
          const dayAgo = new Date();
          dayAgo.setTime(dayAgo.getTime() - 24 * 60 * 60 * 1000);
          inputs[input.name] = dayAgo.toISOString();
        } else if (input.name === 'end' && !inputValue) {
          // Default to now for end inputs without a default
          inputs[input.name] = new Date().toISOString();
        } else if (inputValue) {
          inputs[input.name] = inputValue;
        }
      } else if (input.name === 'start' && inputValue === undefined) {
        // Default to 24 hours ago for start inputs without a default
        const dayAgo = new Date();
        dayAgo.setTime(dayAgo.getTime() - 24 * 60 * 60 * 1000);
        inputs[input.name] = dayAgo.toISOString();
      } else if (input.name === 'end' && inputValue === undefined) {
        // Default to now for end inputs without a default
        inputs[input.name] = new Date().toISOString();
      } else if (inputValue !== undefined) {
        inputs[input.name] = inputValue;
      }
    });
  }

  // Also process any provided inputs that aren't in the definition (for flexibility)
  if (providedInputs) {
    Object.entries(providedInputs).forEach(([key, value]) => {
      // Only process if not already handled above
      if (!(key in inputs) && typeof value === 'string') {
        if (value === '__DYNAMIC_24H_AGO__') {
          const dayAgo = new Date();
          dayAgo.setTime(dayAgo.getTime() - 24 * 60 * 60 * 1000);
          inputs[key] = dayAgo.toISOString();
        } else if (value === '__DYNAMIC_7D_AGO__') {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setTime(sevenDaysAgo.getTime() - 7 * 24 * 60 * 60 * 1000);
          inputs[key] = sevenDaysAgo.toISOString();
        } else if (value === '__DYNAMIC_NOW__') {
          inputs[key] = new Date().toISOString();
        } else {
          inputs[key] = value;
        }
      } else if (!(key in inputs)) {
        inputs[key] = value;
      }
    });
  }

  return inputs;
}
