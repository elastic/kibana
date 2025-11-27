/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { WorkflowStepExecutionDto } from '@kbn/workflows';

/**
 * Execution context structure that mirrors the server-side StepContext
 * Used for template expression hover to show actual runtime values
 */
export interface ExecutionContext {
  inputs?: Record<string, any>;
  steps: Record<string, StepExecutionData>;
  workflow?: Record<string, any>;
  execution?: Record<string, any>;
  event?: Record<string, any>;
  consts?: Record<string, any>;
}

export interface StepExecutionData {
  output?: any;
  error?: string | null;
  input?: any;
  status?: string;
  state?: Record<string, any>; // For foreach steps: { items, item, index, total }
}

/**
 * Build execution context from step executions and execution metadata
 * This creates a structure similar to what's available at runtime for templates
 */
export function buildExecutionContext(
  stepExecutions: WorkflowStepExecutionDto[] | undefined,
  executionContextData?: Record<string, any>
): ExecutionContext | null {
  if (!stepExecutions || stepExecutions.length === 0) {
    return null;
  }

  // Build steps object from step executions
  const steps: Record<string, StepExecutionData> = {};

  for (const stepExecution of stepExecutions) {
    steps[stepExecution.stepId] = {
      output: stepExecution.output,
      error: stepExecution.error,
      input: stepExecution.input,
      status: stepExecution.status,
      state: stepExecution.state as Record<string, any> | undefined,
    };
  }

  // Build full context
  const context: ExecutionContext = {
    steps,
  };

  // Add execution context data if available
  if (executionContextData) {
    if (executionContextData.inputs) {
      context.inputs = executionContextData.inputs as Record<string, any>;
    }

    if (executionContextData.workflow) {
      context.workflow = executionContextData.workflow as Record<string, any>;
    }

    if (executionContextData.execution) {
      context.execution = executionContextData.execution as Record<string, any>;
    }

    if (executionContextData.event) {
      context.event = executionContextData.event as Record<string, any>;
    }

    if (executionContextData.consts) {
      context.consts = executionContextData.consts as Record<string, any>;
    }
  }

  return context;
}
