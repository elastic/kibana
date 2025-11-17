/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { JsonValue } from '@kbn/utility-types';
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
  TIMED_OUT = 'timed_out',
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
  context: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
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
  cancellationReason?: string;
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
  action: (stepInputs?: Record<string, unknown>) => Promise<Record<string, unknown> | void>;
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
  output?: JsonValue;
  input?: JsonValue;

  /** Specific step execution instance state. Used by loops, retries, etc to track execution context. */
  state?: Record<string, unknown>;
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
  /** If specified, only this step and its children were executed */
  stepId?: string | undefined;
  stepExecutions: WorkflowStepExecutionDto[];
  duration: number | null;
  triggeredBy?: string; // 'manual' or 'scheduled'
  yaml: string;
  context?: Record<string, unknown>;
}

export type WorkflowExecutionListItemDto = Omit<
  WorkflowExecutionDto,
  'stepExecutions' | 'yaml' | 'workflowDefinition'
>;

export interface WorkflowExecutionListDto {
  results: WorkflowExecutionListItemDto[];
  page: number;
  size: number;
  total: number;
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
  definition: WorkflowSchema.optional(),
  deleted_at: z.date().nullable().default(null),
  yaml: z.string(),
  valid: z.boolean().readonly(),
});

export type EsWorkflow = z.infer<typeof EsWorkflowSchema>;

export type EsWorkflowCreate = Omit<
  EsWorkflow,
  'id' | 'createdAt' | 'createdBy' | 'lastUpdatedAt' | 'lastUpdatedBy' | 'yaml' | 'deleted_at'
>;

export const CreateWorkflowCommandSchema = z.object({
  yaml: z.string(),
  id: z.string().optional(),
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
  size: z.number().default(100),
  page: z.number().default(1),
  createdBy: z.array(z.string()).optional(),
  // bool or number transformed to boolean
  enabled: z.array(z.union([z.boolean(), z.number().transform((val) => val === 1)])).optional(),
  query: z.string().optional(),
  _full: z.boolean().default(false),
});

export const RunWorkflowCommandSchema = z.object({
  inputs: z.record(z.unknown()),
});
export type RunWorkflowCommand = z.infer<typeof RunWorkflowCommandSchema>;

export const RunStepCommandSchema = z.object({
  workflowYaml: z.string(),
  stepId: z.string(),
  contextOverride: z.record(z.unknown()).optional(),
});
export type RunStepCommand = z.infer<typeof RunStepCommandSchema>;

export const TestWorkflowCommandSchema = z.object({
  workflowYaml: z.string(),
  inputs: z.record(z.unknown()),
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
  lastUpdatedAt: string;
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
  createdAt: string;
  createdBy: string;
  lastUpdatedAt: string;
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
  createdAt: string;
  history: WorkflowExecutionHistoryModel[];
  tags?: string[];
  valid: boolean;
}

export interface WorkflowListDto {
  page: number;
  size: number;
  total: number;
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

export interface ConnectorSubAction {
  name: string;
  displayName: string;
}

export interface ConnectorInstance {
  id: string;
  name: string;
  isPreconfigured: boolean;
  isDeprecated: boolean;
}

export interface ConnectorTypeInfo {
  actionTypeId: string;
  displayName: string;
  instances: ConnectorInstance[];
  enabled: boolean;
  enabledInConfig: boolean;
  enabledInLicense: boolean;
  minimumLicenseRequired: string;
  subActions: ConnectorSubAction[];
}

export type ConnectorTypeInfoMinimal = Pick<ConnectorTypeInfo, 'actionTypeId' | 'displayName'>;

export interface ConnectorContract {
  type: string;
  paramsSchema: z.ZodType;
  connectorIdRequired?: boolean;
  connectorId?: z.ZodType;
  outputSchema: z.ZodType;
  description?: string;
  summary?: string;
  instances?: ConnectorInstance[];
}

export interface DynamicConnectorContract extends ConnectorContract {
  /** Action type ID from Kibana actions plugin */
  actionTypeId: string;
  /** Available connector instances */
  instances: Array<{
    id: string;
    name: string;
    isPreconfigured: boolean;
    isDeprecated: boolean;
  }>;
  /** Whether this connector type is enabled */
  enabled?: boolean;
  /** Whether this is a system action type */
  isSystemActionType?: boolean;
}

export interface InternalConnectorContract extends ConnectorContract {
  /** HTTP method(s) for this API endpoint */
  methods?: string[];
  /** Summary for this API endpoint */
  summary?: string;
  /** URL pattern(s) for this API endpoint */
  patterns?: string[];
  /** Whether this is an internal connector with hardcoded endpoint details */
  isInternal?: boolean;
  /** Documentation URL for this API endpoint */
  documentation?: string | null;
  /** Parameter type metadata for proper request building */
  parameterTypes?: {
    pathParams?: string[];
    urlParams?: string[];
    bodyParams?: string[];
  };
}

export interface ConnectorExamples {
  params?: Record<string, string>;
  snippet?: string;
}

export interface EnhancedInternalConnectorContract extends InternalConnectorContract {
  examples?: ConnectorExamples;
}

export type ConnectorContractUnion = DynamicConnectorContract | EnhancedInternalConnectorContract;

export interface WorkflowsSearchParams {
  size: number;
  page: number;
  query?: string;
  createdBy?: string[];
  enabled?: boolean[];
}
