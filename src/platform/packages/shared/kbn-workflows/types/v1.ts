/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import type { WorkflowYaml } from '../spec/schema';
import { WorkflowSchema } from '../spec/schema';

export enum ExecutionStatus {
  // In progress
  PENDING = 'pending',
  WAITING_FOR_INPUT = 'waiting_for_input',
  RUNNING = 'running',

  // Done
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  SKIPPED = 'skipped',
}

export interface EsWorkflowExecution {
  spaceId: string;
  id: string;
  workflowId: string;
  status: ExecutionStatus;
  context: Record<string, string>;
  workflowDefinition: WorkflowYaml;
  /** Serialized graphlib.Graph */
  executionGraph?: any;
  currentNodeId?: string; // The node currently being executed
  createdAt: string;
  error: string | null;
  createdBy: string;
  startedAt: string;
  finishedAt: string;
  duration: number;
  triggeredBy?: string; // 'manual' or 'scheduled'
  traceId?: string; // APM trace ID for observability
  entryTransactionId?: string; // APM root transaction ID for trace embeddable
}

export interface ProviderInput {
  type: 'string' | 'number' | 'boolean';
  required: boolean;
  defaultValue?: string | number | boolean;
}

export interface Provider {
  type: string;
  action: (stepInputs?: Record<string, any>) => Promise<Record<string, any> | void>;
  inputsDefinition: Record<string, ProviderInput>;
}

export interface EsWorkflowStepExecution {
  spaceId: string;
  id: string;
  stepId: string;
  workflowRunId: string;
  workflowId: string;
  status: ExecutionStatus;
  startedAt: string;
  completedAt?: string;
  executionTimeMs?: number;
  topologicalIndex: number;
  error?: string | null;
  output?: Record<string, any> | null;
  state?: Record<string, any>;
}

export interface WorkflowExecutionHistoryModel {
  id: string;
  workflowId?: string;
  workflowName?: string;
  status: ExecutionStatus;
  startedAt: string;
  finishedAt: string;
  duration: number | null;
}

export interface WorkflowExecutionLogModel {
  spaceId: string;
  timestamp: string;
  message: string;
  level: string;
}

export interface WorkflowExecutionDto {
  spaceId: string;
  id: string;
  status: ExecutionStatus;
  startedAt: string;
  finishedAt: string;
  workflowId?: string;
  workflowName?: string;
  stepExecutions: EsWorkflowStepExecution[];
  duration: number | null;
  triggeredBy?: string; // 'manual' or 'scheduled'
}

export type WorkflowExecutionListItemDto = Omit<WorkflowExecutionDto, 'stepExecutions'>;

export interface WorkflowExecutionListDto {
  results: WorkflowExecutionListItemDto[];
  _pagination: {
    page: number;
    limit: number;
    total: number;
    next?: string;
    prev?: string;
  };
}

// TODO: convert to actual elastic document spec

export const EsWorkflowSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  enabled: z.boolean(),
  tags: z.array(z.string()),
  createdAt: z.date(),
  createdBy: z.string(),
  lastUpdatedAt: z.date(),
  lastUpdatedBy: z.string(),
  definition: WorkflowSchema,
  deleted_at: z.date().nullable().default(null),
  yaml: z.string(),
});

export type EsWorkflow = z.infer<typeof EsWorkflowSchema>;

export const CreateWorkflowCommandSchema = z.object({
  yaml: z.string(),
});

export const UpdateWorkflowCommandSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  enabled: z.boolean(),
  tags: z.array(z.string()),
  yaml: z.string(),
});

export const SearchWorkflowCommandSchema = z.object({
  triggerType: z.string().optional(),
  limit: z.number().default(100),
  page: z.number().default(0),
  createdBy: z.array(z.string()).optional(),
  enabled: z.array(z.boolean()).optional(),
  query: z.string().optional(),
  _full: z.boolean().default(false),
});

export type CreateWorkflowCommand = z.infer<typeof CreateWorkflowCommandSchema>;

export interface UpdatedWorkflowResponseDto {
  id: string;
  lastUpdatedAt: Date;
  lastUpdatedBy: string | undefined;
}

export interface WorkflowDetailDto {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  createdAt: Date;
  createdBy: string;
  lastUpdatedAt: Date;
  lastUpdatedBy: string;
  definition: WorkflowYaml;
  yaml: string;
}

export interface WorkflowListItemDto {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  definition: WorkflowYaml;
  createdAt: Date;
  history: WorkflowExecutionHistoryModel[];
  tags?: string[];
}

export interface WorkflowListDto {
  _pagination: {
    page: number;
    limit: number;
    total: number;
    next?: string;
    prev?: string;
  };
  results: WorkflowListItemDto[];
}
export interface WorkflowExecutionEngineModel
  extends Pick<EsWorkflow, 'id' | 'name' | 'enabled' | 'definition'> {
  /** Serialized graphlib.Graph */
  executionGraph?: any;
}

export interface WorkflowListItemAction {
  isPrimary?: boolean;
  type: string;
  color: string;
  name: string;
  icon: string;
  description: string;
  onClick: (item: WorkflowListItemDto) => void;
}

export interface WorkflowExecutionsHistoryStats {
  date: string;
  timestamp: string;
  completed: number;
  failed: number;
  cancelled: number;
}

export interface WorkflowStatsDto {
  workflows: {
    enabled: number;
    disabled: number;
  };
  executions: WorkflowExecutionsHistoryStats[];
}

export interface WorkflowAggsDto {
  [key: string]: {
    key: string;
    label: string;
  }[];
}
