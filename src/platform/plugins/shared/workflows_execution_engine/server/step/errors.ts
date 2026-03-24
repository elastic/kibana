/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// eslint-disable-next-line max-classes-per-file
import type { EsWorkflowExecution } from '@kbn/workflows';
import type { GraphNodeUnion } from '@kbn/workflows/graph';
import { ExecutionError } from '@kbn/workflows/server';
import type { WorkflowsExecutionEngineConfig } from '../config';

export const DEFAULT_MAX_STEP_SIZE = '10mb';
export const DEFAULT_MAX_CUMULATIVE_OUTPUT_SIZE = '150mb';
export const DEFAULT_MAX_WORKFLOW_OUTPUT_SIZE = '5mb';
export const DEFAULT_MAX_STEPS_PER_WORKFLOW = 150;

const BYTE_UNITS: Array<{ unit: string; size: number }> = [
  { unit: 'GB', size: 1024 * 1024 * 1024 },
  { unit: 'MB', size: 1024 * 1024 },
  { unit: 'KB', size: 1024 },
  { unit: 'B', size: 1 },
];

/**
 * Formats a byte count into a human-readable string (e.g., "15.2 MB").
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  for (const { unit, size } of BYTE_UNITS) {
    if (bytes >= size) {
      const value = bytes / size;
      return `${Number.isInteger(value) ? value : value.toFixed(1)} ${unit}`;
    }
  }
  return `${bytes} B`;
}

const BYTE_SIZE_PATTERN = /^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)$/i;

const UNIT_MULTIPLIERS: Record<string, number> = {
  b: 1,
  kb: 1024,
  mb: 1024 * 1024,
  gb: 1024 * 1024 * 1024,
};

/**
 * Parses a byte size string (e.g., "10mb", "15MB", "1gb", "500kb") into bytes.
 * Also accepts raw numbers (treated as bytes).
 */
export function parseByteSize(value: string | number): number {
  if (typeof value === 'number') {
    return value;
  }

  const match = value.trim().match(BYTE_SIZE_PATTERN);
  if (!match) {
    throw new Error(
      `Invalid byte size string: "${value}". Expected format: <number><unit> (e.g., "10mb", "1gb", "500kb").`
    );
  }

  const [, numStr, unit] = match;
  const num = parseFloat(numStr);
  const multiplier = UNIT_MULTIPLIERS[unit.toLowerCase()];
  return Math.floor(num * multiplier);
}

/**
 * Safely measures the serialized size of an output value.
 * Returns the byte count on success, or -1 if the value is not serializable
 * (e.g., streams, circular references, functions).
 */
export function safeOutputSize(output: unknown): number {
  try {
    const json = JSON.stringify(output);
    return Buffer.byteLength(json, 'utf8');
  } catch {
    // Circular references, BigInt, or other non-serializable values
    return -1;
  }
}

/**
 * Resolves the effective max-step-size in bytes from the resolution chain:
 * step-level > workflow settings > plugin config > hardcoded default.
 * Used by BaseAtomicNodeImplementation and WorkflowContextManager (for LiquidJS limits).
 */
export function resolveMaxStepSizeBytes(
  node: GraphNodeUnion | undefined,
  workflowExecution: EsWorkflowExecution | undefined,
  config: WorkflowsExecutionEngineConfig | undefined
): number {
  try {
    const nodeConfig =
      node && 'configuration' in node
        ? (node.configuration as Record<string, unknown> | undefined)
        : undefined;
    const stepLimit = nodeConfig?.['max-step-size'];
    if (stepLimit) {
      return parseByteSize(stepLimit as string | number);
    }

    const workflowLimit = workflowExecution?.workflowDefinition?.settings?.['max-step-size'];
    if (workflowLimit) {
      return parseByteSize(workflowLimit);
    }

    if (config?.maxResponseSize) {
      return config.maxResponseSize.getValueInBytes();
    }

    return parseByteSize(DEFAULT_MAX_STEP_SIZE);
  } catch {
    return parseByteSize(DEFAULT_MAX_STEP_SIZE);
  }
}

/**
 * Error thrown when a step's response or output exceeds the configured size limit.
 * Used by both Layer 1 (pre-emptive I/O enforcement) and Layer 2 (base class output guard).
 */
export class ResponseSizeLimitError extends ExecutionError {
  constructor(limitBytes: number, stepName: string) {
    super({
      type: 'StepSizeLimitExceeded',
      message:
        `Step "${stepName}" output exceeded the ` +
        `${formatBytes(limitBytes)} size limit. ` +
        `Configure 'max-step-size' at the step or workflow level to increase the limit, ` +
        `or reduce the response size (e.g., filter fields, limit results).`,
      details: {
        limitBytes,
      },
    });
  }
}

/**
 * Error thrown when a LiquidJS template render produces output exceeding the step's size limit.
 * Thrown mid-render by the SizeLimitedEmitter to prevent OOM.
 */
export class TemplateSizeLimitExceeded extends ExecutionError {
  constructor(limitBytes: number) {
    super({
      type: 'TemplateSizeLimitExceeded',
      message:
        `Template rendering produced output exceeding the ${formatBytes(limitBytes)} size limit. ` +
        `Simplify the template or increase 'max-step-size'.`,
      details: { limitBytes },
    });
  }
}

/**
 * Error thrown when the cumulative output across all steps exceeds the workflow budget.
 */
export class WorkflowOutputBudgetExceeded extends ExecutionError {
  constructor(budgetBytes: number, totalBytes: number, stepName: string) {
    super({
      type: 'WorkflowOutputBudgetExceeded',
      message:
        `Workflow exceeded the cumulative output budget of ${formatBytes(budgetBytes)} ` +
        `after step "${stepName}" (total accumulated: ${formatBytes(totalBytes)}). ` +
        `Consider using '_source' filtering, reducing response sizes, or splitting into child workflows.`,
      details: { budgetBytes, totalBytes },
    });
  }
}

/**
 * Error thrown at definition time when a workflow has too many steps.
 */
export class WorkflowStepCountExceeded extends Error {
  constructor(count: number, maxSteps: number) {
    super(
      `Workflow exceeds the maximum of ${maxSteps} steps (found ${count}). ` +
        `Consider splitting into child workflows using 'workflow.execute'.`
    );
    this.name = 'WorkflowStepCountExceeded';
  }
}

/**
 * Error thrown when the final workflow output exceeds the configured limit.
 */
export class WorkflowOutputSizeExceeded extends ExecutionError {
  constructor(limitBytes: number, actualBytes: number) {
    super({
      type: 'WorkflowOutputSizeExceeded',
      message:
        `Workflow output (${formatBytes(actualBytes)}) exceeded the ` +
        `${formatBytes(limitBytes)} limit. ` +
        `Configure 'max-workflow-output-size' in workflow settings to increase the limit.`,
      details: { limitBytes, actualBytes },
    });
  }
}
