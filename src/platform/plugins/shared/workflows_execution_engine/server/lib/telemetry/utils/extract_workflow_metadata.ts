/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowYaml } from '@kbn/workflows/spec/schema';

/**
 * Determines if a step is a connector step by checking if it has a 'connector-id' field.
 */
function isConnectorStep(step: unknown): boolean {
  return (
    step !== null &&
    typeof step === 'object' &&
    'connector-id' in step &&
    step['connector-id'] !== undefined
  );
}

/**
 * Metadata extracted from a workflow definition for telemetry purposes
 */
export interface WorkflowTelemetryMetadata {
  /**
   * Whether the workflow is enabled
   */
  enabled: boolean;
  /**
   * Total number of steps in the workflow (including nested steps)
   */
  stepCount: number;
  /**
   * Unique connector types used in the workflow
   */
  connectorTypes: string[];
  /**
   * Count of steps by step type (e.g., { 'foreach': 2, 'slack.webhook': 5, 'if': 1 })
   */
  stepTypeCounts: Record<string, number>;
  /**
   * Whether the workflow has scheduled triggers
   */
  hasScheduledTriggers: boolean;
  /**
   * Whether the workflow has alert triggers
   */
  hasAlertTriggers: boolean;
  /**
   * Number of inputs defined in the workflow
   */
  inputCount: number;
  /**
   * Number of triggers defined in the workflow
   */
  triggerCount: number;
  /**
   * Whether the workflow has a timeout configured
   */
  hasTimeout: boolean;
  /**
   * Whether the workflow has concurrency settings configured
   */
  hasConcurrency: boolean;
  /**
   * Maximum concurrent runs if concurrency is configured
   */
  concurrencyMax?: number;
  /**
   * Concurrency strategy if concurrency is configured ('queue', 'drop', or 'cancel-in-progress')
   */
  concurrencyStrategy?: string;
  /**
   * Whether the workflow has on-failure handling configured
   */
  hasOnFailure: boolean;
}

/**
 * Recursively counts all steps in a workflow, including nested steps
 */
function countStepsRecursive(steps: WorkflowYaml['steps']): number {
  if (!steps || !Array.isArray(steps)) {
    return 0;
  }

  let count = 0;
  for (const step of steps) {
    if (step && typeof step === 'object') {
      count++; // Count this step

      // Count nested steps in 'steps', 'else', and 'fallback' arrays
      if ('steps' in step && Array.isArray(step.steps)) {
        count += countStepsRecursive(step.steps);
      }
      if ('else' in step && Array.isArray(step.else)) {
        count += countStepsRecursive(step.else);
      }
      if ('fallback' in step && Array.isArray(step.fallback)) {
        count += countStepsRecursive(step.fallback);
      }
    }
  }
  return count;
}

/**
 * Extracts telemetry metadata from a workflow definition.
 * This is a server-side version that works directly with WorkflowYaml objects.
 *
 * @param workflow - The workflow definition (can be partial)
 * @returns Metadata object with extracted information
 */
export function extractWorkflowMetadata(
  workflow: Partial<WorkflowYaml> | null | undefined
): WorkflowTelemetryMetadata {
  // Default values for empty/invalid workflows
  const defaultMetadata: WorkflowTelemetryMetadata = {
    enabled: false,
    stepCount: 0,
    connectorTypes: [],
    stepTypeCounts: {},
    hasScheduledTriggers: false,
    hasAlertTriggers: false,
    inputCount: 0,
    triggerCount: 0,
    hasTimeout: false,
    hasConcurrency: false,
    hasOnFailure: false,
  };

  if (!workflow) {
    return defaultMetadata;
  }

  // Count steps (including nested)
  const stepCount = countStepsRecursive(workflow.steps ?? []);

  // Extract all step types and count occurrences
  const stepTypeCounts: Record<string, number> = {};
  const connectorTypes: string[] = [];

  function countStepTypesRecursive(steps: WorkflowYaml['steps']): void {
    if (!steps || !Array.isArray(steps)) {
      return;
    }

    for (const step of steps) {
      if (step && typeof step === 'object' && 'type' in step && typeof step.type === 'string') {
        const stepType = step.type;
        // Count this step type
        stepTypeCounts[stepType] = (stepTypeCounts[stepType] || 0) + 1;

        // Track connector types by checking if step has 'connector-id' field
        // Extract only the connector name (part before the dot), not the full step type
        if (isConnectorStep(step)) {
          const connectorName = stepType.split('.')[0];
          if (!connectorTypes.includes(connectorName)) {
            connectorTypes.push(connectorName);
          }
        }

        // Recursively process nested steps
        if ('steps' in step && Array.isArray(step.steps)) {
          countStepTypesRecursive(step.steps);
        }
        if ('else' in step && Array.isArray(step.else)) {
          countStepTypesRecursive(step.else);
        }
        if ('fallback' in step && Array.isArray(step.fallback)) {
          countStepTypesRecursive(step.fallback);
        }
      }
    }
  }

  countStepTypesRecursive(workflow.steps ?? []);

  // Check triggers
  const triggers = workflow.triggers || [];
  const hasScheduledTriggersValue = triggers.some((trigger) => trigger?.type === 'scheduled');
  const hasAlertTriggers = triggers.some((trigger) => trigger?.type === 'alert');

  // Count inputs
  const inputCount = Array.isArray(workflow.inputs) ? workflow.inputs.length : 0;

  // Extract settings
  const enabled = Boolean(workflow.enabled);
  const settings = workflow.settings;
  const hasTimeout = Boolean(settings?.timeout);
  const hasConcurrency = Boolean(settings?.concurrency);
  const concurrencyMax = settings?.concurrency?.max;
  const concurrencyStrategy = settings?.concurrency?.strategy;
  const hasOnFailure = Boolean(settings?.['on-failure']);

  return {
    enabled,
    stepCount,
    connectorTypes: [...new Set(connectorTypes)], // Remove duplicates
    stepTypeCounts,
    hasScheduledTriggers: hasScheduledTriggersValue,
    hasAlertTriggers,
    inputCount,
    triggerCount: triggers.length,
    hasTimeout,
    hasConcurrency,
    ...(concurrencyMax !== undefined && { concurrencyMax }),
    ...(concurrencyStrategy && { concurrencyStrategy }),
    hasOnFailure,
  };
}
