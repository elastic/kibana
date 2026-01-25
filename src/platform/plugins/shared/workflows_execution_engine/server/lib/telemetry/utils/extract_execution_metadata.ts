/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsWorkflowExecution, EsWorkflowStepExecution } from '@kbn/workflows';

/**
 * Metadata extracted from a workflow execution for telemetry purposes
 */
export interface WorkflowExecutionTelemetryMetadata {
  /**
   * Number of steps that were executed
   */
  executedStepCount: number;
  /**
   * Number of steps that completed successfully
   */
  successfulStepCount: number;
  /**
   * Number of steps that failed
   */
  failedStepCount: number;
  /**
   * Number of steps that were skipped
   */
  skippedStepCount: number;
  /**
   * Array of step types that were actually executed
   */
  executedStepTypes: string[];
  /**
   * Array of connector types that were actually used in execution
   */
  executedConnectorTypes: string[];
  /**
   * Maximum execution depth (nested scopes)
   */
  maxExecutionDepth: number;
  /**
   * Whether any steps were retried
   */
  hasRetries: boolean;
  /**
   * Whether any steps used on-failure handlers (fallback, continue)
   */
  hasErrorHandling: boolean;
  /**
   * Number of unique step IDs that were executed (accounts for loops/retries)
   */
  uniqueStepIdsExecuted: number;
}

/**
 * Extracts telemetry metadata from a workflow execution and its step executions.
 *
 * @param workflowExecution - The workflow execution
 * @param stepExecutions - Array of step executions for this workflow execution
 * @returns Metadata object with extracted execution information
 */
export function extractExecutionMetadata(
  workflowExecution: EsWorkflowExecution,
  stepExecutions: EsWorkflowStepExecution[]
): WorkflowExecutionTelemetryMetadata {
  const executedStepCount = stepExecutions.length;
  const successfulStepCount = stepExecutions.filter((step) => step.status === 'completed').length;
  const failedStepCount = stepExecutions.filter((step) => step.status === 'failed').length;
  const skippedStepCount = stepExecutions.filter((step) => step.status === 'skipped').length;

  // Extract unique step types and connector types from executed steps
  const executedStepTypesSet = new Set<string>();
  const executedConnectorTypesSet = new Set<string>();
  const uniqueStepIdsSet = new Set<string>();

  for (const stepExecution of stepExecutions) {
    if (stepExecution.stepType) {
      executedStepTypesSet.add(stepExecution.stepType);
      // Extract connector type if it's a connector step (step type contains a dot)
      if (stepExecution.stepType.includes('.')) {
        const connectorName = stepExecution.stepType.split('.')[0];
        executedConnectorTypesSet.add(connectorName);
      }
    }
    uniqueStepIdsSet.add(stepExecution.stepId);
  }

  // Calculate max execution depth from scope stack
  const maxExecutionDepth = stepExecutions.reduce((maxDepth, stepExecution) => {
    const depth = stepExecution.scopeStack?.length || 0;
    return Math.max(maxDepth, depth);
  }, 0);

  // Check for retries - if a step ID appears multiple times, it was likely retried
  const stepIdCounts = new Map<string, number>();
  for (const stepExecution of stepExecutions) {
    const count = stepIdCounts.get(stepExecution.stepId) || 0;
    stepIdCounts.set(stepExecution.stepId, count + 1);
  }
  const hasRetries = Array.from(stepIdCounts.values()).some((count) => count > 1);

  // Check for error handling - if a step failed but workflow continued, error was handled
  const hasErrorHandling =
    failedStepCount > 0 &&
    workflowExecution.status !== 'failed' &&
    workflowExecution.status !== 'cancelled';

  return {
    executedStepCount,
    successfulStepCount,
    failedStepCount,
    skippedStepCount,
    executedStepTypes: Array.from(executedStepTypesSet),
    executedConnectorTypes: Array.from(executedConnectorTypesSet),
    maxExecutionDepth,
    hasRetries,
    hasErrorHandling,
    uniqueStepIdsExecuted: uniqueStepIdsSet.size,
  };
}

/**
 * Extracts the alert rule ID from workflow execution context.
 * Returns undefined if not triggered by alert or rule ID not available.
 *
 * @param workflowExecution - The workflow execution
 * @returns The alert rule ID if available, undefined otherwise
 */
export function extractAlertRuleId(workflowExecution: EsWorkflowExecution): string | undefined {
  if (workflowExecution.triggeredBy !== 'alert') {
    return undefined;
  }

  // Try to extract from context.event.rule.id
  const context = workflowExecution.context || {};
  const event = context.event as { rule?: { id?: string }; type?: string } | undefined;

  if (event?.type === 'alert' && event?.rule?.id) {
    return event.rule.id;
  }

  return undefined;
}
