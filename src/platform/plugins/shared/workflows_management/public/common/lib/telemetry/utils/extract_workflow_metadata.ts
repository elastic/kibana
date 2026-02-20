/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowYaml } from '@kbn/workflows/spec/schema';
import { parseWorkflowYamlForAutocomplete } from '../../../../../common/lib/yaml/parse_workflow_yaml_for_autocomplete';

/**
 * Determines if a step is a connector step by checking if it has a 'connector-id' field.
 * This is more reliable than checking step type patterns, as connector steps always
 * have a connector-id field, while built-in steps (foreach, if, console, etc.) do not.
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
   * Unique step types used in the workflow (e.g., ['foreach', 'if', 'console'])
   * This array format enables easy aggregation in dashboards.
   */
  stepTypes: string[];
  /**
   * Count of steps by step type (e.g., { 'foreach': 2, 'slack.webhook': 5, 'if': 1 })
   */
  stepTypeCounts: Record<string, number>;
  /**
   * Trigger types configured in the workflow (e.g., ['scheduled', 'alert', 'index'])
   * This array format enables easy aggregation in dashboards.
   */
  triggerTypes: string[];
  /**
   * Number of inputs defined in the workflow
   */
  inputCount: number;
  /**
   * Number of constants defined in the workflow
   */
  constCount: number;
  /**
   * Number of triggers defined in the workflow
   */
  triggerCount: number;
  /**
   * Maximum concurrent runs if concurrency is configured
   */
  concurrencyMax?: number;
  /**
   * Concurrency strategy if concurrency is configured ('queue', 'drop', or 'cancel-in-progress')
   */
  concurrencyStrategy?: string;
  /**
   * Settings configured in the workflow (e.g., ['timeout', 'concurrency', 'on-failure'])
   * This array format enables easy aggregation in dashboards.
   */
  settingsUsed: string[];
  /**
   * Whether the workflow has a description
   */
  hasDescription: boolean;
  /**
   * Number of tags assigned to the workflow
   */
  tagCount: number;
}

/**
 * Extracts telemetry metadata from a workflow YAML definition
 *
 * @param workflow - The workflow YAML definition (can be partial)
 * @returns Metadata object with extracted information
 *
 * @example
 * ```typescript
 * const metadata = extractWorkflowMetadata(workflowDefinition);
 * telemetry.reportWorkflowCreated({
 *   workflowId,
 *   ...metadata,
 *   ...this.getBaseResultParams(error),
 * });
 * ```
 */
export function extractWorkflowMetadata(
  workflow: Partial<WorkflowYaml> | null | undefined
): WorkflowTelemetryMetadata {
  // Default values for empty/invalid workflows
  const defaultMetadata: WorkflowTelemetryMetadata = {
    enabled: false,
    stepCount: 0,
    connectorTypes: [],
    stepTypes: [],
    stepTypeCounts: {},
    triggerTypes: [],
    inputCount: 0,
    constCount: 0,
    triggerCount: 0,
    settingsUsed: [],
    hasDescription: false,
    tagCount: 0,
  };

  if (!workflow) {
    return defaultMetadata;
  }

  // Extract all step types and count occurrences
  const stepTypeCounts: Record<string, number> = {};
  const connectorTypes = new Set<string>();

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
          connectorTypes.add(connectorName);
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

  countStepTypesRecursive(workflow.steps || []);

  // Derive stepCount from stepTypeCounts (sum of all counts) to avoid traversing steps twice
  const stepCount = Object.values(stepTypeCounts).reduce((sum, count) => sum + count, 0);

  // Extract unique step types as an array for easy aggregation
  const stepTypes = Object.keys(stepTypeCounts);

  // Extract unique trigger types as an array for easy aggregation
  const triggers = workflow.triggers || [];
  const triggerTypes = [
    ...new Set(
      triggers.filter((trigger) => trigger?.type).map((trigger) => trigger.type as string)
    ),
  ];

  // Count inputs
  const inputCount = Array.isArray(workflow.inputs) ? workflow.inputs.length : 0;

  // Count constants
  const consts = (workflow as { consts?: Record<string, unknown> }).consts || {};
  const constCount = Object.keys(consts).length;

  // Extract settings
  const enabled = Boolean(workflow.enabled);
  const settings = workflow.settings || {};
  const concurrencyMax = settings?.concurrency?.max;
  const concurrencyStrategy = settings?.concurrency?.strategy;

  // Build settingsUsed array from all settings keys for easy aggregation
  const settingsUsed = Object.keys(settings);

  // Extract description and tags info
  const hasDescription = Boolean(workflow.description && workflow.description.trim().length > 0);
  const tags = (workflow as { tags?: string[] }).tags || [];
  const tagCount = tags.length;

  return {
    enabled,
    stepCount,
    connectorTypes: [...connectorTypes],
    stepTypes,
    stepTypeCounts,
    triggerTypes,
    inputCount,
    constCount,
    triggerCount: triggers.length,
    ...(concurrencyMax !== undefined && { concurrencyMax }),
    ...(concurrencyStrategy && { concurrencyStrategy }),
    settingsUsed,
    hasDescription,
    tagCount,
  };
}

/**
 * Step information extracted from a workflow definition for telemetry purposes
 */
export interface StepTelemetryInfo {
  /**
   * The type of the step (e.g., 'foreach', 'if', 'slack.webhook')
   */
  stepType: string;
  /**
   * The connector type if the step uses a connector, undefined otherwise
   */
  connectorType?: string;
  /**
   * The workflow ID if found in the workflow definition
   */
  workflowId?: string;
}

/**
 * Recursively searches for a step by stepId in a workflow's steps array
 */
function findStepRecursive(
  steps: WorkflowYaml['steps'],
  stepId: string
): { stepType: string; connectorType?: string } | null {
  if (!Array.isArray(steps)) {
    return null;
  }

  for (const step of steps) {
    if (step && typeof step === 'object' && 'name' in step && step.name === stepId) {
      if ('type' in step && typeof step.type === 'string') {
        const stepType = step.type;
        // Check if it's a connector step
        const connectorType =
          'connector-id' in step && step['connector-id'] !== undefined ? stepType : undefined;
        return { stepType, connectorType };
      }
      return null;
    }

    // Recursively search nested steps
    if ('steps' in step && Array.isArray(step.steps)) {
      const found = findStepRecursive(step.steps, stepId);
      if (found) return found;
    }
    if ('else' in step && Array.isArray(step.else)) {
      const found = findStepRecursive(step.else, stepId);
      if (found) return found;
    }
    if ('fallback' in step && Array.isArray(step.fallback)) {
      const found = findStepRecursive(step.fallback, stepId);
      if (found) return found;
    }
  }

  return null;
}

/**
 * Extracts step information from a workflow YAML string for telemetry purposes.
 * This function parses the YAML and finds the step by stepId, extracting its type and connector type.
 *
 * @param workflowYaml - The workflow YAML string
 * @param stepId - The step ID (name) to find
 * @returns Step information object with stepType, connectorType, and workflowId, or null if not found
 *
 * @example
 * ```typescript
 * const stepInfo = extractStepInfoFromWorkflowYaml(workflowYaml, 'my-step');
 * if (stepInfo) {
 *   telemetry.reportWorkflowStepTestRunInitiated({
 *     workflowId: stepInfo.workflowId,
 *     stepId: 'my-step',
 *     stepType: stepInfo.stepType,
 *     connectorType: stepInfo.connectorType,
 *   });
 * }
 * ```
 */
export function extractStepInfoFromWorkflowYaml(
  workflowYaml: string | null | undefined,
  stepId: string
): StepTelemetryInfo | null {
  if (!workflowYaml) {
    return null;
  }

  const parseResult = parseWorkflowYamlForAutocomplete(workflowYaml);
  if (!parseResult.success) {
    return null;
  }

  const workflowDefinition = parseResult.data;
  const workflowId = workflowDefinition.id as string | undefined;

  // Find the step by stepId
  const steps = workflowDefinition.steps as WorkflowYaml['steps'] | undefined;
  const stepInfo = steps ? findStepRecursive(steps, stepId) : null;

  if (!stepInfo) {
    return { stepType: 'unknown', workflowId };
  }

  return {
    stepType: stepInfo.stepType,
    connectorType: stepInfo.connectorType,
    workflowId,
  };
}
