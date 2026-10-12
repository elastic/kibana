/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
import {
  type EsWorkflowStepExecution,
  ExecutionStatus,
  type WorkflowExecutionDto,
  type WorkflowExecutionHistoryModel,
  type WorkflowExecutionListDto,
} from '@kbn/workflows';
import type { ChildWorkflowExecutionItem } from '@kbn/workflows/types/v1';
import type {
  SearchExecutionViewParams as EngineSearchExecutionViewParams,
  ExecutionVisibility,
  LogSearchResult,
} from '@kbn/workflows-execution-engine/server';
import {
  bulkUpdaterItem,
  getBulkUpdaterWriteResult,
  getStep,
  getStepFacets,
  getWaitingStepId,
  searchExecutions,
  searchExecutionView,
  searchSteps,
} from '@kbn/workflows-execution-engine/server';
import type {
  ExecutionLogsParams,
  StepLogsParams,
} from '@kbn/workflows-execution-engine/server/workflow_event_logger/types';

import {
  createMarkStepAsRespondedUpdater,
  MARK_STEP_AS_RESPONDED_SOURCE_FIELDS,
} from './mark_step_as_responded_updater';
import type { WorkflowExecutionQueryDeps } from './types';
import { WORKFLOWS_INDEX } from '../../common';
import { isIndexNotFoundError } from '../api/lib/es_error_helpers';
import { getChildWorkflowExecutions } from '../api/lib/get_child_workflow_executions';
import {
  getExecutionStepExecutions,
  type GetExecutionStepExecutionsResult,
} from '../api/lib/get_execution_step_executions';
import { getWorkflowExecution } from '../api/lib/get_workflow_execution';
import type { StepExecutionListResult } from '../api/lib/search_step_executions';
import type {
  GetExecutionStepExecutionsParams,
  GetStepExecutionParams,
  SearchStepExecutionsParams,
} from '../api/workflows_management_api';
import type {
  SearchExecutionsViewParams,
  SearchWorkflowExecutionsParams,
} from '../api/workflows_management_service';

/** Max completed steps fetched per page when resolving predecessor `output.reasoning`. */
const PREDECESSOR_REASONING_MAX_HITS = 1000;

/**
 * Extends EsWorkflowStepExecution with the legacy `endedAt` field
 * that may exist on older documents written before the rename to `finishedAt`.
 */
interface StepExecutionWithLegacyFields extends EsWorkflowStepExecution {
  endedAt?: string;
}

/**
 * Filters applied to processed wait-for-input step executions. Multi-value
 * fields are OR'd within a field and AND'd across fields; `q` is a
 * case-insensitive prefix search over responder, workflow id, and step id.
 */
export interface ProcessedWaitForInputFilters {
  q?: string;
  channel?: string[];
  workflowId?: string[];
  respondedBy?: string[];
  sortOrder?: 'asc' | 'desc';
}

interface WaitForInputListOptions {
  visibility?: ExecutionVisibility;
  page?: number;
  perPage?: number;
  includeReasoning?: boolean;
}

/**
 * Result of the cross-workflow `waitForInput` listings. `reasoningByStepId`
 * contains any `output.reasoning` object found on the step that immediately
 * preceded each wait step.
 *
 * `deletedWorkflowIds` lists the parent workflow ids in `results` that no
 * longer resolve to an alive workflow (soft-deleted, or hard-deleted and
 * thus absent). The pending listing filters these out entirely, so the set
 * is only ever populated by the processed/audit listing — which retains the
 * rows so the audit trail survives workflow deletion. Empty when the
 * alive-workflow lookup failed and deletion cannot be attributed reliably.
 */
export interface WaitForInputListResult {
  results: EsWorkflowStepExecution[];
  total: number;
  reasoningByStepId: Map<string, Record<string, unknown>>;
  deletedWorkflowIds: Set<string>;
}

/** Facet buckets for processed wait-for-input step executions. */
export interface ProcessedWaitForInputFacets {
  channel: Array<{ value: string; count: number }>;
  respondedBy: Array<{ value: string; count: number }>;
}

export class WorkflowExecutionQueryService {
  constructor(private readonly deps: WorkflowExecutionQueryDeps) {}

  private executionReads() {
    return {
      logger: this.deps.logger,
      workflowExecutionsDataClient: this.deps.workflowExecutionsDataClient,
      stepExecutionsDataClient: this.deps.stepExecutionsDataClient,
    };
  }

  async getWorkflowExecution(
    executionId: string,
    spaceId: string,
    options?: { includeInput?: boolean; includeOutput?: boolean; omitStepExecutions?: boolean }
  ): Promise<WorkflowExecutionDto | null> {
    return getWorkflowExecution({
      workflowExecutionsDataClient: this.deps.workflowExecutionsDataClient,
      stepExecutionsDataClient: this.deps.stepExecutionsDataClient,
      logger: this.deps.logger,
      workflowExecutionId: executionId,
      spaceId,
      includeInput: options?.includeInput,
      includeOutput: options?.includeOutput,
      omitStepExecutions: options?.omitStepExecutions,
    });
  }

  async getChildWorkflowExecutions(
    parentExecutionId: string,
    spaceId: string
  ): Promise<ChildWorkflowExecutionItem[]> {
    return getChildWorkflowExecutions({
      workflowExecutionsDataClient: this.deps.workflowExecutionsDataClient,
      stepExecutionsDataClient: this.deps.stepExecutionsDataClient,
      parentExecutionId,
      spaceId,
    });
  }

  async getExecutionStepExecutions(
    params: GetExecutionStepExecutionsParams,
    spaceId: string
  ): Promise<GetExecutionStepExecutionsResult> {
    return getExecutionStepExecutions({
      workflowExecutionsDataClient: this.deps.workflowExecutionsDataClient,
      stepExecutionsDataClient: this.deps.stepExecutionsDataClient,
      logger: this.deps.logger,
      workflowExecutionId: params.executionId,
      spaceId,
      page: params.page,
      size: params.size,
    });
  }

  async getWorkflowExecutions(
    params: SearchWorkflowExecutionsParams,
    spaceId: string
  ): Promise<WorkflowExecutionListDto> {
    return searchExecutions(this.executionReads(), {
      spaceId,
      visibility: params.visibility,
      workflowId: params.workflowId,
      statuses: params.statuses,
      executionTypes: params.executionTypes,
      executedBy: params.executedBy,
      concurrencyGroupKey: params.concurrencyGroupKey,
      omitStepRuns: params.omitStepRuns,
      timeRange: {
        startedAfter: params.startedAfter,
        startedBefore: params.startedBefore,
        finishedAfter: params.finishedAfter,
        finishedBefore: params.finishedBefore,
      },
      collapse: params.collapse,
      sortField: params.sortField,
      sortOrder: params.sortOrder,
      page: params.page,
      size: params.size,
      searchAfter: params.searchAfter,
    });
  }

  async searchExecutionsView(
    params: SearchExecutionsViewParams,
    spaceId: string
  ): Promise<WorkflowExecutionListDto> {
    return searchExecutionView(this.executionReads(), {
      spaceId,
      visibility: params.visibility,
      kql: params.kql,
      statuses: params.statuses,
      executionTypes: params.executionTypes,
      executedBy: params.executedBy,
      concurrencyGroupKey: params.concurrencyGroupKey,
      timeRange: {
        startedAfter: params.startedAfter,
        startedBefore: params.startedBefore,
        finishedAfter: params.finishedAfter,
        finishedBefore: params.finishedBefore,
      },
      includeManaged: params.includeManagedExecutions,
      collapse: params.collapse,
      sortField: params.sortField as EngineSearchExecutionViewParams['sortField'],
      sortOrder: params.sortOrder,
      page: params.page,
      size: params.size,
    });
  }

  async getWorkflowExecutionHistory(
    executionId: string,
    spaceId: string
  ): Promise<WorkflowExecutionHistoryModel[]> {
    const response = (await this.deps.stepExecutionsDataClient.search({
      query: {
        bool: {
          must: [{ term: { executionId } }, { term: { spaceId } }],
        },
      },
      sort: [{ timestamp: { order: 'asc' } }],
    })) as estypes.SearchResponse<StepExecutionWithLegacyFields>;

    return response.hits.hits.map((hit) => {
      if (!hit._source) {
        throw new Error('Missing _source in search result');
      }
      const source = hit._source;
      const startedAt = source.startedAt;
      const finishedAt = source.endedAt || source.finishedAt;

      let duration = 0;
      if (startedAt && finishedAt) {
        duration = new Date(finishedAt).getTime() - new Date(startedAt).getTime();
      }

      return {
        ...source,
        finishedAt: finishedAt || '',
        duration,
      };
    });
  }

  async getStepExecutions(params: GetStepExecutionParams, spaceId: string) {
    const step = await getStep(this.executionReads(), {
      executionId: params.executionId,
      stepExecutionId: params.id,
      spaceId,
    });
    return step ? [step] : [];
  }

  async searchStepExecutions(
    params: SearchStepExecutionsParams,
    spaceId: string
  ): Promise<StepExecutionListResult> {
    if (params.workflowId === undefined && params.workflowExecutionIds === undefined) {
      throw new Error('Either workflowExecutionId or workflowId must be provided');
    }
    return searchSteps(this.executionReads(), {
      spaceId,
      workflowId: params.workflowId,
      executionIds: params.workflowExecutionIds,
      stepId: params.stepId,
      stepType: params.stepType,
      includeInput:
        params.includeInput === false || params.includeInput === undefined ? false : undefined,
      includeOutput:
        params.includeOutput === false || params.includeOutput === undefined ? false : undefined,
      includeFields: params.sourceIncludes,
      page: params.page,
      size: params.size,
      startedAfter: params.startedAfter,
      startedBefore: params.startedBefore,
    });
  }

  async getExecutionLogs(params: ExecutionLogsParams): Promise<LogSearchResult> {
    if (!this.deps.workflowEventLoggerService) {
      throw new Error('WorkflowEventLoggerService not initialized');
    }
    return this.deps.workflowEventLoggerService.getExecutionLogs(params);
  }

  async getStepLogs(params: StepLogsParams): Promise<LogSearchResult> {
    if (!this.deps.workflowEventLoggerService) {
      throw new Error('WorkflowEventLoggerService not initialized');
    }
    return this.deps.workflowEventLoggerService.getStepLogs(params);
  }

  /**
   * Lists active `waitForInput` step executions for a space.
   *
   * Pending rows exclude settled steps and rows that have already been claimed
   * by a response audit stamp. Soft-deleted parent workflows are filtered out
   * at read time because step executions are retained unless the workflow is
   * hard-deleted.
   */
  async listWaitingForInputSteps(
    spaceId: string,
    { page = 1, perPage = 100, includeReasoning = false, visibility }: WaitForInputListOptions = {}
  ): Promise<WaitForInputListResult> {
    let listed: StepExecutionListResult;
    try {
      listed = await searchSteps(this.executionReads(), {
        spaceId,
        visibility,
        statuses: [ExecutionStatus.WAITING_FOR_INPUT],
        settlement: 'open',
        sort: 'startedAt:desc',
        page,
        size: perPage,
      });
    } catch (error) {
      this.deps.logger.error(`Failed to list waiting-for-input step executions: ${error}`);
      throw error;
    }

    const { total, results: allResults } = listed;

    if (allResults.length === 0) {
      return {
        results: allResults,
        total,
        reasoningByStepId: new Map(),
        deletedWorkflowIds: new Set(),
      };
    }

    const distinctWorkflowIds = Array.from(
      new Set(
        allResults
          .map((r) => r.workflowId)
          .filter((id): id is string => typeof id === 'string' && id.length > 0)
      )
    );

    // Resolve workflow deletion and optional predecessor reasoning in parallel.
    const [aliveIds, reasoningByStepId] = await Promise.all([
      this.getAliveWorkflowIds(distinctWorkflowIds, spaceId),
      includeReasoning
        ? this.resolvePredecessorReasoning(allResults, spaceId)
        : Promise.resolve(new Map<string, Record<string, unknown>>()),
    ]);

    if (aliveIds === null) {
      // Lookup itself failed (already logged). Fall back to unfiltered
      // results so a transient ES error does not hide active steps.
      return {
        results: allResults,
        total,
        reasoningByStepId,
        deletedWorkflowIds: new Set(),
      };
    }

    const results = allResults.filter((r) => r.workflowId && aliveIds.has(r.workflowId));
    const dropped = allResults.length - results.length;
    // `total` is per-page best-effort: we only know how many of the items in
    // *this page* were orphaned. Across pages the reported total may be
    // slightly optimistic, but it is monotonically corrected as the user
    // pages through. A precise cardinality would require a second
    // aggregation per call, which isn't worth it for a transient state.
    return {
      results,
      total: Math.max(0, total - dropped),
      reasoningByStepId,
      // Pending drops orphans outright, so no surviving row is from a deleted parent.
      deletedWorkflowIds: new Set(),
    };
  }

  /**
   * Lists processed `waitForInput` step executions for a space.
   *
   * A row is processed once it has either terminated or received a response
   * audit stamp. Unlike the pending listing, deleted parent workflows are
   * retained and reported via `deletedWorkflowIds`.
   */
  async listProcessedWaitForInputSteps(
    spaceId: string,
    {
      page = 1,
      perPage = 25,
      includeReasoning = false,
      q,
      channel,
      workflowId,
      respondedBy,
      sortOrder = 'desc',
      visibility,
    }: WaitForInputListOptions & ProcessedWaitForInputFilters = {}
  ): Promise<WaitForInputListResult> {
    let listed: StepExecutionListResult;
    try {
      listed = await searchSteps(this.executionReads(), {
        spaceId,
        visibility,
        stepType: 'waitForInput',
        settlement: 'processed',
        channel,
        workflowIds: workflowId,
        respondedBy,
        q,
        sort: sortOrder === 'asc' ? 'respondedAt:asc' : 'respondedAt:desc',
        page,
        size: perPage,
      });
    } catch (error) {
      this.deps.logger.error(`Failed to list processed wait-for-input step executions: ${error}`);
      throw error;
    }

    const { total, results: allResults } = listed;

    if (allResults.length === 0) {
      return {
        results: allResults,
        total,
        reasoningByStepId: new Map(),
        deletedWorkflowIds: new Set(),
      };
    }

    const distinctWorkflowIds = Array.from(
      new Set(
        allResults
          .map((r) => r.workflowId)
          .filter((id): id is string => typeof id === 'string' && id.length > 0)
      )
    );

    // Resolve workflow deletion and optional predecessor reasoning in parallel.
    const [aliveIds, reasoningByStepId] = await Promise.all([
      this.getAliveWorkflowIds(distinctWorkflowIds, spaceId),
      includeReasoning
        ? this.resolvePredecessorReasoning(allResults, spaceId)
        : Promise.resolve(new Map<string, Record<string, unknown>>()),
    ]);

    if (aliveIds === null) {
      return {
        results: allResults,
        total,
        reasoningByStepId,
        deletedWorkflowIds: new Set(),
      };
    }

    // Processed rows are retained when their parent workflow is deleted; the
    // caller can decide how to display the deleted source.
    const deletedWorkflowIds = new Set(distinctWorkflowIds.filter((id) => !aliveIds.has(id)));
    return {
      results: allResults,
      total,
      reasoningByStepId,
      deletedWorkflowIds,
    };
  }

  /**
   * Returns facet buckets for processed `waitForInput` rows.
   *
   * Facets use the same baseline as `listProcessedWaitForInputSteps`, without
   * caller-supplied filters and without parent-workflow deletion filtering.
   */
  async listProcessedWaitForInputFacets(
    spaceId: string,
    { maxBuckets = 50, visibility }: { maxBuckets?: number; visibility?: ExecutionVisibility } = {}
  ): Promise<ProcessedWaitForInputFacets> {
    try {
      const counts = await getStepFacets(this.executionReads(), {
        spaceId,
        visibility,
        stepType: 'waitForInput',
        settlement: 'processed',
        fields: ['hitl.channel', 'hitl.respondedBy'],
        maxBuckets,
      });
      return {
        channel: counts['hitl.channel'] ?? [],
        respondedBy: counts['hitl.respondedBy'] ?? [],
      };
    } catch (error) {
      this.deps.logger.error(`Failed to compute processed wait-for-input facets: ${error}`);
      throw error;
    }
  }

  /**
   * Best-effort lookup of `output.reasoning` from the completed step that
   * finished immediately before each wait step started.
   */
  private async resolvePredecessorReasoning(
    steps: EsWorkflowStepExecution[],
    spaceId: string
  ): Promise<Map<string, Record<string, unknown>>> {
    const reasoningByStepId = new Map<string, Record<string, unknown>>();

    const runIds = Array.from(
      new Set(
        steps
          .map((step) => step.workflowRunId)
          .filter((id): id is string => typeof id === 'string' && id.length > 0)
      )
    );
    const waitStarts = steps
      .map((step) => step.startedAt)
      .filter(
        (startedAt): startedAt is string => typeof startedAt === 'string' && startedAt.length > 0
      );
    if (runIds.length === 0 || waitStarts.length === 0) {
      return reasoningByStepId;
    }
    const maxWaitStart = waitStarts.reduce((latest, current) =>
      current > latest ? current : latest
    );

    let predecessors: EsWorkflowStepExecution[];
    try {
      const listed = await searchSteps(this.executionReads(), {
        spaceId,
        executionIds: runIds,
        statuses: [ExecutionStatus.COMPLETED],
        finishedBefore: maxWaitStart,
        includeFields: ['workflowRunId', 'finishedAt', 'output.reasoning'],
        size: PREDECESSOR_REASONING_MAX_HITS,
      });
      predecessors = listed.results;
    } catch (error) {
      // Reasoning is optional context; do not fail the listing if lookup fails.
      this.deps.logger.warn(`Failed to resolve predecessor reasoning: ${error}`);
      return reasoningByStepId;
    }

    const completedByRun = new Map<string, Array<{ finishedAt?: string; output?: unknown }>>();
    for (const source of predecessors) {
      if (source?.workflowRunId) {
        const forRun = completedByRun.get(source.workflowRunId) ?? [];
        forRun.push({ finishedAt: source.finishedAt, output: source.output });
        completedByRun.set(source.workflowRunId, forRun);
      }
    }

    for (const step of steps) {
      const { id, workflowRunId, startedAt } = step;
      const candidates =
        id && workflowRunId && startedAt ? completedByRun.get(workflowRunId) : undefined;
      if (candidates && id && startedAt) {
        // Candidates are finishedAt-desc within a run; the first that finished
        // at or before the wait step started is its immediate predecessor.
        const predecessor = candidates.reduce<
          { finishedAt?: string; output?: unknown } | undefined
        >((best, candidate) => {
          if (typeof candidate.finishedAt !== 'string' || candidate.finishedAt > startedAt) {
            return best;
          }
          if (!best?.finishedAt || candidate.finishedAt > best.finishedAt) {
            return candidate;
          }
          return best;
        }, undefined);
        const reasoning = extractReasoning(predecessor?.output);
        if (reasoning) {
          reasoningByStepId.set(id, reasoning);
        }
      }
    }

    return reasoningByStepId;
  }

  /**
   * Returns the subset of `ids` that point to alive workflows in `spaceId`
   * — i.e. exist in `.workflows-workflows` and are not soft-deleted
   * (`deleted_at` not set). Returns `null` if the lookup itself errored so
   * the caller can fall back to unfiltered behaviour.
   */
  private async getAliveWorkflowIds(ids: string[], spaceId: string): Promise<Set<string> | null> {
    if (ids.length === 0) {
      return new Set();
    }
    try {
      const response = await this.deps.esClient.search<unknown>({
        index: WORKFLOWS_INDEX,
        query: {
          bool: {
            must: [{ ids: { values: ids } }, { term: { spaceId } }],
            must_not: [{ exists: { field: 'deleted_at' } }],
          },
        },
        _source: false,
        size: ids.length,
        track_total_hits: false,
      });
      const alive = new Set<string>();
      for (const hit of response.hits.hits) {
        if (hit._id) alive.add(hit._id);
      }
      return alive;
    } catch (error) {
      if (isIndexNotFoundError(error)) {
        // Fresh install / test env: no workflows index yet means no alive
        // workflows, so every step execution is by definition an orphan.
        return new Set();
      }
      this.deps.logger.warn(
        `Failed to validate parent workflows for wait-for-input listing; returning unfiltered results: ${error}`
      );
      return null;
    }
  }

  /**
   * Returns the HITL wait step currently blocking the run, whether or not it
   * has already been claimed, so the atomic `markStepAsResponded` write stays
   * the single first-writer-wins arbiter for concurrent resumes. Callers that
   * already know the step id (inbox, Kibana UI, Scout) should pass it and skip
   * this lookup.
   */
  async getWaitingStepExecutionId(executionId: string, spaceId: string): Promise<string | null> {
    return getWaitingStepId(this.executionReads(), { executionId, spaceId });
  }

  async getStepExecution(
    params: GetStepExecutionParams,
    spaceId: string
  ): Promise<EsWorkflowStepExecution | null> {
    return getStep(this.executionReads(), {
      executionId: params.executionId,
      stepExecutionId: params.id,
      spaceId,
    });
  }

  /**
   * Claims a `waitForInput` step by writing HITL audit metadata before resume.
   *
   * Returns `true` when this caller won the claim, or `false` when the doc is
   * missing, belongs to another space, has already settled (terminal status
   * or `finishedAt` set), or was already claimed. Unexpected ES failures are
   * rethrown.
   */
  async markStepAsResponded(
    stepExecutionId: string,
    audit: { respondedBy: string; respondedAt: string; channel?: string },
    spaceId: string
  ): Promise<boolean> {
    try {
      const { items } = await this.deps.stepExecutionsDataClient.bulk({
        refresh: 'wait_for',
        items: [
          bulkUpdaterItem<
            EsWorkflowStepExecution,
            (typeof MARK_STEP_AS_RESPONDED_SOURCE_FIELDS)[number]
          >({
            operation: 'update',
            documentId: stepExecutionId,
            sourceFields: MARK_STEP_AS_RESPONDED_SOURCE_FIELDS,
            retryOnConflict: 3,
            updater: createMarkStepAsRespondedUpdater(audit, spaceId),
          }),
        ],
      });

      const writeResult = getBulkUpdaterWriteResult(items[0]);
      if (writeResult === 'conflict') {
        // Retries were exhausted without a write; this is not a lost claim, so surface it.
        throw new Error(`Version conflict claiming step execution ${stepExecutionId}`);
      }
      return writeResult === 'updated';
    } catch (error) {
      this.deps.logger.error(
        `Failed to mark step execution ${stepExecutionId} as responded: ${error}`
      );
      throw error;
    }
  }
}

/**
 * Pull a plain-object `reasoning` value out of a step output, when present.
 */
function extractReasoning(output: unknown): Record<string, unknown> | undefined {
  if (!output || typeof output !== 'object' || Array.isArray(output)) {
    return undefined;
  }
  const reasoning = (output as Record<string, unknown>).reasoning;
  if (!reasoning || typeof reasoning !== 'object' || Array.isArray(reasoning)) {
    return undefined;
  }
  return reasoning as Record<string, unknown>;
}
