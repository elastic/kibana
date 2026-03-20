/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  BulkCreateWorkflowsCommand,
  ExecutionStatus,
  ExecutionType,
  WorkflowDetailDto,
} from '@kbn/workflows';

export interface BulkCreateWorkflowsParams {
  workflows: BulkCreateWorkflowsCommand['workflows'];
  overwrite?: boolean;
}
export interface BulkCreateWorkflowsResponse {
  created: WorkflowDetailDto[];
  failed: Array<{ index: number; id: string; error: string }>;
}

export interface CreateWorkflowParams {
  [key: string]: unknown;
}

export interface UpdateWorkflowParams {
  [key: string]: unknown;
}

export interface GetBatchWorkflowsParams {
  ids: string[];
  source?: string[];
}

export interface ValidateWorkflowParams {
  yaml: string;
}

export interface ExportWorkflowsParams {
  ids: string[];
}

export interface GetAggsParams {
  fields: string[];
}

export interface GetSchemaParams {
  loose: boolean;
}

export interface RunWorkflowOptions {
  inputs: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface TestWorkflowParams {
  workflowId?: string;
  workflowYaml?: string;
  inputs: Record<string, unknown>;
}

export interface GetWorkflowExecutionsParams {
  statuses?: ExecutionStatus[];
  executionTypes?: ExecutionType[];
  executedBy?: string[];
  omitStepRuns?: boolean;
  page?: number;
  size?: number;
}

export interface GetWorkflowStepExecutionsParams {
  stepId?: string;
  includeInput?: boolean;
  includeOutput?: boolean;
  page?: number;
  size?: number;
}

export interface GetExecutionParams {
  includeInput?: boolean;
  includeOutput?: boolean;
}

export interface ResumeExecutionParams {
  input: Record<string, unknown>;
}

export interface WorkflowsConfig {
  eventDrivenExecutionEnabled: boolean;
}
