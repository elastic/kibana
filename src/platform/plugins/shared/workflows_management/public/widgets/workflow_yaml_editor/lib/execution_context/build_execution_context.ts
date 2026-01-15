/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { JsonObject, JsonValue } from '@kbn/utility-types';
import type { SerializedError, WorkflowStepExecutionDto } from '@kbn/workflows';

/**
 * Execution context structure that mirrors the server-side StepContext
 * Used for template expression hover to show actual runtime values
 */
export interface ExecutionContext {
  inputs?: JsonObject;
  steps: Record<string, StepExecutionData>;
  workflow?: JsonObject;
  execution?: JsonObject;
  event?: JsonObject;
  consts?: JsonObject;
}

export interface StepExecutionData {
  output?: JsonValue;
  error?: SerializedError;
  input?: JsonValue;
  status?: string;
  state?: JsonObject; // For foreach steps: { items, item, index, total }
}

/**
 * Build execution context from step executions and execution metadata
 * This creates a structure similar to what's available at runtime for templates
 */
export function buildExecutionContext(
  stepExecutions: WorkflowStepExecutionDto[] | undefined,
  executionContextData?: Record<string, unknown>
): ExecutionContext | null {
  if (!stepExecutions || stepExecutions.length === 0) {
    return null;
  }

  // Build steps object from step executions
  const steps: Record<string, StepExecutionData> = {};

  for (const stepExecution of stepExecutions) {
    steps[stepExecution.stepId] = {
      output: stepExecution.output as JsonValue | undefined,
      error: stepExecution.error,
      input: stepExecution.input as JsonValue | undefined,
      status: stepExecution.status,
      state: stepExecution.state as JsonObject | undefined,
    };
  }

  // Build full context
  const context: ExecutionContext = {
    steps,
  };

  // Add execution context data if available
  if (executionContextData) {
    if (executionContextData.inputs) {
      context.inputs = executionContextData.inputs as JsonObject;
    }

    if (executionContextData.workflow) {
      context.workflow = executionContextData.workflow as JsonObject;
    }

    if (executionContextData.execution) {
      context.execution = executionContextData.execution as JsonObject;
    }

    if (executionContextData.event) {
      context.event = executionContextData.event as JsonObject;
    }

    if (executionContextData.consts) {
      context.consts = executionContextData.consts as JsonObject;
    }
  }

  return context;
}
