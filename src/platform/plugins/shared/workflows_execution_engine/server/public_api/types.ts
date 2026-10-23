/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
import type {
  ChildWorkflowExecutionItem,
  EsWorkflowExecution,
  EsWorkflowStepExecution,
  ExecutionStatus,
  ExecutionType,
  WorkflowExecutionCollapseField,
  WorkflowExecutionListDto,
  WorkflowExecutionSortField,
  WorkflowExecutionSortOrder,
  WorkflowStepExecutionListDto,
} from '@kbn/workflows';
import type {
  StepExecutionsDataClient,
  WorkflowExecutionsDataClient,
} from '../repositories/data_access_layer';

/** Data clients and logger bound by plugin start. Callers do not see this. */
export interface ExecutionReadDeps {
  logger: Logger;
  workflowExecutionsDataClient: WorkflowExecutionsDataClient;
  stepExecutionsDataClient: StepExecutionsDataClient;
}

/** Caller-computed workflow ACL. The engine does not derive this. */
export type ExecutionVisibility =
  | { access: 'all' }
  | { access: 'deny' }
  | { access: 'exclude'; workflowIds: readonly string[] };

export interface ExecutionTimeRange {
  startedAfter?: string;
  startedBefore?: string;
  finishedAfter?: string;
  finishedBefore?: string;
}

/** `open`: no `finishedAt` and no `hitl.respondedAt`. `processed`: either is set. */
export type StepSettlement = 'open' | 'processed';

export type StepSort = 'startedAt:asc' | 'startedAt:desc' | 'respondedAt:asc' | 'respondedAt:desc';

export type StepFacetField =
  | 'status'
  | 'stepType'
  | 'workflowId'
  | 'hitl.channel'
  | 'hitl.respondedBy';

/** Shared by `searchSteps` and `getStepFacets`. Workflow and execution id may both be omitted. */
export interface StepSearchCriteria {
  spaceId: string;
  visibility?: ExecutionVisibility;
  workflowId?: string;
  workflowIds?: readonly string[];
  executionId?: string;
  /** Empty array matches nothing. */
  executionIds?: readonly string[];
  stepId?: string;
  stepType?: string;
  statuses?: readonly ExecutionStatus[];
  settlement?: StepSettlement;
  channel?: readonly string[];
  respondedBy?: readonly string[];
  /** Case-insensitive prefix over `hitl.respondedBy`, `workflowId`, and `stepId`. */
  q?: string;
  startedAfter?: string;
  startedBefore?: string;
  /** Upper bound on `finishedAt`, used when resolving a predecessor step. */
  finishedBefore?: string;
}

export interface WorkflowExecutionRead {
  execution: EsWorkflowExecution;
  /** Empty when `omitSteps` is set, or when loading steps exceeds the response limit. */
  steps: EsWorkflowStepExecution[];
}

export interface ExecutionStepsPage {
  /** Present so the route can keep the managed-execution privilege check. */
  managed?: boolean;
  steps: WorkflowStepExecutionListDto;
}

export interface DailyExecutionCount {
  date: string;
  timestamp: number;
  completed: number;
  failed: number;
  cancelled: number;
}

export type StepFacetCounts = Partial<
  Record<StepFacetField, Array<{ value: string; count: number }>>
>;

/** Thrown when an all-spaces active-execution search times out or has failed shards. */
export class ExecutionSearchIncompleteError extends Error {
  constructor() {
    super('The active execution search was incomplete.');
    this.name = 'ExecutionSearchIncompleteError';
  }
}

export interface GetExecutionParams {
  executionId: string;
  spaceId: string;
  includeInput?: boolean;
  includeOutput?: boolean;
  omitSteps?: boolean;
}

export interface GetExecutionStepsParams {
  executionId: string;
  spaceId: string;
  page: number;
  size: number;
}

export interface GetChildExecutionsParams {
  parentExecutionId: string;
  spaceId: string;
}

export interface SearchExecutionsParams {
  spaceId: string;
  visibility?: ExecutionVisibility;
  workflowId?: string;
  statuses?: readonly ExecutionStatus[];
  executionTypes?: readonly ExecutionType[];
  executedBy?: readonly string[];
  concurrencyGroupKey?: string;
  omitStepRuns?: boolean;
  timeRange?: ExecutionTimeRange;
  collapse?: WorkflowExecutionCollapseField;
  sortField?: WorkflowExecutionSortField;
  sortOrder?: WorkflowExecutionSortOrder;
  page?: number;
  size?: number;
  searchAfter?: readonly unknown[];
}

export interface SearchExecutionViewParams {
  spaceId: string;
  visibility?: ExecutionVisibility;
  /** Compiled inside the engine. Invalid KQL throws an error with `statusCode: 400`. */
  kql?: string;
  statuses?: readonly ExecutionStatus[];
  executionTypes?: readonly ExecutionType[];
  executedBy?: readonly string[];
  concurrencyGroupKey?: string;
  timeRange?: ExecutionTimeRange;
  includeManaged?: boolean;
  collapse?: WorkflowExecutionCollapseField;
  sortField?: WorkflowExecutionSortField | 'duration' | 'triggeredBy';
  sortOrder?: WorkflowExecutionSortOrder;
  page?: number;
  size?: number;
}

export interface SearchStepsParams extends StepSearchCriteria {
  includeInput?: boolean;
  includeOutput?: boolean;
  /**
   * `_source` paths, including nested ones such as `output.structured_output`.
   * When set, `includeInput` and `includeOutput` are ignored.
   */
  includeFields?: readonly string[];
  page?: number;
  size?: number;
  sort?: StepSort;
}

export interface GetStepFacetsParams extends StepSearchCriteria {
  fields: readonly StepFacetField[];
  maxBuckets?: number;
}

export interface GetStepParams {
  executionId: string;
  stepExecutionId: string;
  spaceId: string;
}

export interface GetStepExecutionsByIdsParams {
  ids: readonly string[];
  spaceId: string;
  sourceIncludes?: ReadonlyArray<Extract<keyof EsWorkflowStepExecution, string>>;
  sourceExcludes?: ReadonlyArray<Extract<keyof EsWorkflowStepExecution, string>>;
  /** `false` drops `input`. Omitted or `true` leaves it, unless `sourceIncludes` already limits `_source`. */
  includeInput?: boolean;
  /** `false` drops `output`. Omitted or `true` leaves it, unless `sourceIncludes` already limits `_source`. */
  includeOutput?: boolean;
}

export interface GetWorkflowExecutionsByIdParams {
  ids: readonly string[];
  spaceId: string;
  sourceIncludes?: ReadonlyArray<Extract<keyof EsWorkflowExecution, string>>;
  sourceExcludes?: ReadonlyArray<Extract<keyof EsWorkflowExecution, string>>;
}

export interface GetWaitingStepIdParams {
  executionId: string;
  spaceId: string;
}

export interface GetDailyExecutionCountsParams {
  spaceId: string;
  since: string;
  visibility?: ExecutionVisibility;
  includeManaged?: boolean;
}

export interface HasNonTerminalExecutionParams {
  workflowId: string;
  /** Omitted for a global managed definition: search every space. */
  spaceId?: string;
}

export interface WorkflowExecutionReadApi {
  getExecution: (params: GetExecutionParams) => Promise<WorkflowExecutionRead | null>;
  getWorkflowExecutionsById: (
    params: GetWorkflowExecutionsByIdParams
  ) => Promise<EsWorkflowExecution[]>;
  getExecutionSteps: (params: GetExecutionStepsParams) => Promise<ExecutionStepsPage>;
  getChildExecutions: (params: GetChildExecutionsParams) => Promise<ChildWorkflowExecutionItem[]>;
  searchExecutions: (params: SearchExecutionsParams) => Promise<WorkflowExecutionListDto>;
  searchExecutionView: (params: SearchExecutionViewParams) => Promise<WorkflowExecutionListDto>;
  searchSteps: (params: SearchStepsParams) => Promise<WorkflowStepExecutionListDto>;
  getStepFacets: (params: GetStepFacetsParams) => Promise<StepFacetCounts>;
  getStep: (params: GetStepParams) => Promise<EsWorkflowStepExecution | null>;
  getStepExecutionsByIds: (
    params: GetStepExecutionsByIdsParams
  ) => Promise<EsWorkflowStepExecution[]>;
  getWaitingStepId: (params: GetWaitingStepIdParams) => Promise<string | null>;
  getDailyExecutionCounts: (
    params: GetDailyExecutionCountsParams
  ) => Promise<DailyExecutionCount[]>;
  hasNonTerminalExecution: (params: HasNonTerminalExecutionParams) => Promise<boolean>;
}
