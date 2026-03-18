/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Example, TaskOutput } from '@kbn/evals';

export interface WorkflowEditExample extends Example {
  input: {
    instruction: string;
    initialYaml: string;
  };
  output: {
    criteria: string[];
    expectedToolIds?: string[];
  };
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
  };
  metadata?: {
    category?: string;
  };
}

export interface WorkflowTaskOutput extends TaskOutput {
  messages: Array<{ message: string }>;
  steps?: Array<{ type?: string; tool_id?: string; results?: unknown[] }>;
  errors: unknown[];
  resultYaml?: string;
}
