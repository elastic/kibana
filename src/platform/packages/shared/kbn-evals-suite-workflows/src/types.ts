/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Example, TaskOutput } from '@kbn/evals';

export interface StructuralExpectations {
  expectedStepCount?: number | { min: number; max: number };
  expectedStepTypes?: string[];
  expectedStepNames?: string[];
}

export interface EfficiencyExpectations {
  /** Maximum tool calls allowed before score degrades (tiered penalty). */
  expectedMaxToolCalls?: number;
  /** Golden-path tool sequence for trajectory scoring. */
  expectedToolSequence?: string[];
}

export interface WorkflowEditExample extends Example {
  input: {
    instruction: string;
    initialYaml: string;
  };
  output: {
    criteria: string[];
    expectedToolIds?: string[];
    preservedStepNames?: string[];
  } & StructuralExpectations &
    EfficiencyExpectations;
  metadata?: {
    category?: string;
  };
}

export interface WorkflowCreateExample extends Example {
  input: {
    instruction: string;
  };
  output: {
    criteria: string[];
  } & StructuralExpectations &
    EfficiencyExpectations;
  metadata?: {
    category?: string;
  };
}

export type WorkflowTaskOutput = TaskOutput & {
  messages: Array<{ message: string }>;
  steps?: Array<{
    type?: string;
    tool_id?: string;
    params?: Record<string, unknown>;
    results?: unknown[];
  }>;
  errors: unknown[];
  resultYaml?: string;
  latencyMs?: number;
};
