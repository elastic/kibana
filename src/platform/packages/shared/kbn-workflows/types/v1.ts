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
  WAITING = 'waiting',
  WAITING_FOR_INPUT = 'waiting_for_input',
  RUNNING = 'running',

  // Done
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  SKIPPED = 'skipped',
}
export type ExecutionStatusUnion = `${ExecutionStatus}`;
export const ExecutionStatusValues = Object.values(ExecutionStatus);

export enum ExecutionType {
  TEST = 'test',
  PRODUCTION = 'production',
}
export type ExecutionTypeUnion = `${ExecutionType}`;
export const ExecutionTypeValues = Object.values(ExecutionType);

/**
 * An interface representing the state of a step scope during workflow execution.
 */

export interface ScopeEntry {
  /**
   * Node that entered this scope.
   * Examples: enterForeach_step1, enterRetry_step1, etc
   */
  nodeId: string;
  nodeType: string;
  /**
   * Optional unique identifier for the scope instance.
   * For example, iteration identifier (0,1,2,3,etc), retry attempt identifier (attempt-1, attempt-2, etc), and so on
   */
  scopeId?: string;
}
export interface StackFrame {
  /** Step that created this frame */
  stepId: string;
  /** Scope entries within this frame */
  nestedScopes: ScopeEntry[];
}

export interface EsWorkflowExecution {
  spaceId: string;
  id: string;
  workflowId: string;
  isTestRun: boolean;
  status: ExecutionStatus;
  context: Record<string, any>;
  workflowDefinition: WorkflowYaml;
  yaml: string;
  currentNodeId?: string; // The node currently being executed
  /** If specified, the only this step and its children will be executed */
  stepId?: string;
  scopeStack: StackFrame[];
  createdAt: string;
  error: string | null;
  createdBy: string;
  startedAt: string;
  finishedAt: string;
  cancelRequested: boolean;
  cancelledAt?: string;
  cancelledBy?: string;
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
  stepType?: string;

  /** Current step's stack frames. */
  scopeStack: StackFrame[];
  workflowRunId: string;
  workflowId: string;
  status: ExecutionStatus;
  startedAt: string;
  completedAt?: string;
  executionTimeMs?: number;

  /** Topological index of step in workflow graph. */
  topologicalIndex: number;

  /** Overall execution index in the entire workflow. */
  globalExecutionIndex: number;

  /**
   * Execution index within specific stepId.
   * There might be several instances of the same stepId if it's inside loops, retries, etc.
   */
  stepExecutionIndex: number;
  error?: string | null;
  output?: Record<string, any> | null;
  input?: Record<string, any> | null;

  /** Specific step execution instance state. Used by loops, retries, etc to track execution context. */
  state?: Record<string, any>;
}

export type WorkflowStepExecutionDto = Omit<EsWorkflowStepExecution, 'spaceId'>;

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
  workflowDefinition: WorkflowYaml;
  stepId?: string | undefined;
  stepExecutions: WorkflowStepExecutionDto[];
  duration: number | null;
  triggeredBy?: string; // 'manual' or 'scheduled'
  yaml: string;
}

export type WorkflowExecutionListItemDto = Omit<
  WorkflowExecutionDto,
  'stepExecutions' | 'yaml' | 'workflowDefinition'
>;

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
  valid: z.boolean().readonly(),
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
  // bool or number transformed to boolean
  enabled: z.array(z.union([z.boolean(), z.number().transform((val) => val === 1)])).optional(),
  query: z.string().optional(),
  _full: z.boolean().default(false),
});

export const RunWorkflowCommandSchema = z.object({
  inputs: z.record(z.any()),
});
export type RunWorkflowCommand = z.infer<typeof RunWorkflowCommandSchema>;

export const RunStepCommandSchema = z.object({
  workflowYaml: z.string(),
  stepId: z.string(),
  contextOverride: z.record(z.any()).optional(),
});
export type RunStepCommand = z.infer<typeof RunStepCommandSchema>;

export const TestWorkflowCommandSchema = z.object({
  workflowYaml: z.string(),
  inputs: z.record(z.any()),
});
export type TestWorkflowCommand = z.infer<typeof TestWorkflowCommandSchema>;

export const RunWorkflowResponseSchema = z.object({
  workflowExecutionId: z.string(),
});
export type RunWorkflowResponseDto = z.infer<typeof RunWorkflowResponseSchema>;

export const TestWorkflowResponseSchema = z.object({
  workflowExecutionId: z.string(),
});
export type TestWorkflowResponseDto = z.infer<typeof TestWorkflowResponseSchema>;

export type CreateWorkflowCommand = z.infer<typeof CreateWorkflowCommandSchema>;

export interface UpdatedWorkflowResponseDto {
  id: string;
  lastUpdatedAt: Date;
  lastUpdatedBy: string | undefined;
  enabled: boolean;
  valid: boolean;
  validationErrors: string[];
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
  definition: WorkflowYaml | null;
  yaml: string;
  valid: boolean;
}

export interface WorkflowListItemDto {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  definition: WorkflowYaml | null;
  createdAt: Date;
  history: WorkflowExecutionHistoryModel[];
  tags?: string[];
  valid: boolean;
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
  extends Pick<EsWorkflow, 'id' | 'name' | 'enabled' | 'definition' | 'yaml'> {
  isTestRun?: boolean;
  spaceId?: string;
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
