/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
import { ExecutionType } from '@kbn/workflows';
import type {
  EsWorkflowStepExecution,
  WorkflowExecutionDto,
  WorkflowExecutionHistoryModel,
  WorkflowExecutionListDto,
} from '@kbn/workflows';
import type { ChildWorkflowExecutionItem } from '@kbn/workflows/types/v1';
import type { LogSearchResult } from '@kbn/workflows-execution-engine/server';
import type {
  ExecutionLogsParams,
  StepLogsParams,
} from '@kbn/workflows-execution-engine/server/workflow_event_logger/types';

import type { WorkflowExecutionQueryDeps } from './types';
import {
  WORKFLOWS_EXECUTIONS_INDEX,
  WORKFLOWS_INDEX,
  WORKFLOWS_STEP_EXECUTIONS_INDEX,
} from '../../common';
import { buildTimeRangeFilter } from '../api/lib/build_time_range_filter';
import { isIndexNotFoundError } from '../api/lib/es_error_helpers';
import { getChildWorkflowExecutions } from '../api/lib/get_child_workflow_executions';
import { getWorkflowExecution } from '../api/lib/get_workflow_execution';
import {
  searchStepExecutions,
  type StepExecutionListResult,
} from '../api/lib/search_step_executions';
import { searchWorkflowExecutions } from '../api/lib/search_workflow_executions';
import type {
  GetStepExecutionParams,
  SearchStepExecutionsParams,
} from '../api/workflows_management_api';
import type { SearchWorkflowExecutionsParams } from '../api/workflows_management_service';

const DEFAULT_PAGE_SIZE = 100;

/**
 * Upper bound on completed step-execution docs fetched in a single
 * predecessor-reasoning lookup. The lookup is scoped to the workflow runs
 * on the current inbox page and ordered most-recent-first per run, so the
 * immediate predecessor of each wait step is always near the top — a
 * generous cap keeps the soft-interface resolution bounded without missing
 * the relevant doc for realistically-sized runs.
 */
const PREDECESSOR_REASONING_MAX_HITS = 1000;

/**
 * Extends EsWorkflowStepExecution with the legacy `endedAt` field
 * that may exist on older documents written before the rename to `finishedAt`.
 */
interface StepExecutionWithLegacyFields extends EsWorkflowStepExecution {
  endedAt?: string;
}

/**
 * Inbox-history filter bundle pushed down into native ES clauses by
 * {@link WorkflowExecutionQueryService.listProcessedWaitForInputSteps}.
 * Multi-value fields are OR'd within a field and AND'd across fields,
 * mirroring the OpenAPI contract. `q` is a case-insensitive substring
 * search over the indexed responder / workflow / step keyword fields.
 */
export interface InboxHistoryFilters {
  q?: string;
  channel?: string[];
  workflowId?: string[];
  respondedBy?: string[];
  sortOrder?: 'asc' | 'desc';
}

/**
 * Result of the cross-workflow `waitForInput` listings. `reasoningByStepId`
 * carries the soft-interface reasoning resolved from each row's preceding
 * step output, keyed by the wait step's execution id (absent when the
 * predecessor produced no `reasoning`).
 *
 * `deletedWorkflowIds` lists the parent workflow ids in `results` that no
 * longer resolve to an alive workflow (soft-deleted, or hard-deleted and
 * thus absent). The pending listing filters these out entirely, so the set
 * is only ever populated by the processed/audit listing — which retains the
 * rows so the audit trail survives workflow deletion, and tags them so the
 * UI can flag the source as gone. Empty when the alive-workflow lookup
 * failed (we can't reliably attribute deletion, so we omit the flag).
 */
export interface WaitForInputListResult {
  results: EsWorkflowStepExecution[];
  total: number;
  reasoningByStepId: Map<string, Record<string, unknown>>;
  deletedWorkflowIds: Set<string>;
}

/**
 * Result of {@link WorkflowExecutionQueryService.listProcessedWaitForInputFacets}.
 * Mirrors the `ListInboxActionsHistoryFacetsResponse` schema; declared as a
 * plain interface here so the workflows plugin doesn't grow a runtime
 * dependency on the inbox-common Zod schemas.
 */
export interface InboxHistoryFacets {
  channel: Array<{ value: string; count: number }>;
  respondedBy: Array<{ value: string; count: number }>;
}

/**
 * Aggregations envelope shape we ask Elasticsearch to populate on the
 * facets query. Both aggs are fixed-name `terms` aggregations over
 * `keyword` fields, so the bucket key type is `string`.
 */
interface InboxHistoryFacetAggs {
  channel: estypes.AggregationsStringTermsAggregate;
  respondedBy: estypes.AggregationsStringTermsAggregate;
}

export class WorkflowExecutionQueryService {
  constructor(private readonly deps: WorkflowExecutionQueryDeps) {}

  async getWorkflowExecution(
    executionId: string,
    spaceId: string,
    options?: { includeInput?: boolean; includeOutput?: boolean }
  ): Promise<WorkflowExecutionDto | null> {
    return getWorkflowExecution({
      esClient: this.deps.esClient,
      logger: this.deps.logger,
      workflowExecutionIndex: WORKFLOWS_EXECUTIONS_INDEX,
      stepsExecutionIndex: WORKFLOWS_STEP_EXECUTIONS_INDEX,
      workflowExecutionId: executionId,
      spaceId,
      includeInput: options?.includeInput,
      includeOutput: options?.includeOutput,
    });
  }

  async getChildWorkflowExecutions(
    parentExecutionId: string,
    spaceId: string
  ): Promise<ChildWorkflowExecutionItem[]> {
    return getChildWorkflowExecutions({
      esClient: this.deps.esClient,
      workflowExecutionIndex: WORKFLOWS_EXECUTIONS_INDEX,
      stepsExecutionIndex: WORKFLOWS_STEP_EXECUTIONS_INDEX,
      parentExecutionId,
      spaceId,
    });
  }

  async getWorkflowExecutions(
    params: SearchWorkflowExecutionsParams,
    spaceId: string
  ): Promise<WorkflowExecutionListDto> {
    const must: estypes.QueryDslQueryContainer[] = [
      ...(params.workflowId ? [{ term: { workflowId: params.workflowId } }] : []),
      {
        bool: {
          should: [{ term: { spaceId } }, { bool: { must_not: { exists: { field: 'spaceId' } } } }],
          minimum_should_match: 1,
        },
      },
    ];

    if (params.statuses) {
      must.push({ terms: { status: params.statuses } });
    }
    if (params.executionTypes && params.executionTypes?.length === 1) {
      const isTestRun = params.executionTypes[0] === ExecutionType.TEST;

      if (isTestRun) {
        must.push({ term: { isTestRun } });
      } else {
        must.push({
          bool: {
            should: [
              { term: { isTestRun: false } },
              { bool: { must_not: { exists: { field: 'isTestRun' } } } },
            ],
            minimum_should_match: 1,
          },
        });
      }
    }
    if (params.executedBy && params.executedBy.length > 0) {
      must.push({ terms: { executedBy: params.executedBy } });
    }

    if (params.concurrencyGroupKey !== undefined) {
      must.push({ term: { concurrencyGroupKey: params.concurrencyGroupKey } });
    }

    if (params.omitStepRuns) {
      must.push({ bool: { must_not: { exists: { field: 'stepId' } } } });
    }

    const startedAtRange = buildTimeRangeFilter(
      'startedAt',
      params.startedAfter,
      params.startedBefore
    );
    if (startedAtRange) {
      must.push(startedAtRange);
    }

    const finishedAtRange = buildTimeRangeFilter(
      'finishedAt',
      params.finishedAfter,
      params.finishedBefore
    );
    if (finishedAtRange) {
      must.push(finishedAtRange);
    }

    const page = params.page ?? 1;
    const size = params.size ?? DEFAULT_PAGE_SIZE;
    const from = (page - 1) * size;
    const sort = params.sortField
      ? [{ [params.sortField]: { order: params.sortOrder ?? 'desc' } }]
      : undefined;

    return searchWorkflowExecutions({
      esClient: this.deps.esClient,
      logger: this.deps.logger,
      workflowExecutionIndex: WORKFLOWS_EXECUTIONS_INDEX,
      query: { bool: { must } },
      size,
      from,
      page,
      sort,
      collapse: params.collapse ? { field: params.collapse } : undefined,
    });
  }

  async getWorkflowExecutionHistory(
    executionId: string,
    spaceId: string
  ): Promise<WorkflowExecutionHistoryModel[]> {
    const response = await this.deps.esClient.search<StepExecutionWithLegacyFields>({
      index: WORKFLOWS_STEP_EXECUTIONS_INDEX,
      query: {
        bool: {
          must: [{ term: { executionId } }, { term: { spaceId } }],
        },
      },
      sort: [{ timestamp: { order: 'asc' } }],
    });

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
    const searchResult = await searchStepExecutions({
      esClient: this.deps.esClient,
      logger: this.deps.logger,
      stepsExecutionIndex: WORKFLOWS_STEP_EXECUTIONS_INDEX,
      workflowExecutionId: params.executionId,
      additionalQuery: { term: { id: params.id } },
      spaceId,
    });
    return searchResult.results;
  }

  async searchStepExecutions(
    params: SearchStepExecutionsParams,
    spaceId: string
  ): Promise<StepExecutionListResult> {
    const sourceExcludes: string[] = [];
    if (!params.includeInput) sourceExcludes.push('input');
    if (!params.includeOutput) sourceExcludes.push('output');

    return searchStepExecutions({
      esClient: this.deps.esClient,
      logger: this.deps.logger,
      stepsExecutionIndex: WORKFLOWS_STEP_EXECUTIONS_INDEX,
      workflowId: params.workflowId,
      stepId: params.stepId,
      spaceId,
      sourceExcludes: sourceExcludes.length > 0 ? sourceExcludes : undefined,
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
   * Cross-workflow fan-out: returns every step execution currently blocked on
   * `waitForInput` in the given space. Used by the Inbox plugin to surface
   * pending HITL items across all workflows a user has access to.
   *
   * Intentionally minimal — the Inbox registry owns higher-level concerns
   * like status filtering and paginated merge-sort across providers.
   *
   * NOTE: only `spaceId` and `status` are filtered here because those are the
   * only keyword-indexed fields on `.workflows-step-executions`. An earlier
   * draft also added `term: { stepType: 'waitForInput' }`, which silently
   * matched zero docs and made the Inbox UI appear empty even when workflows
   * were paused on `waitForInput`. The status filter is sufficient because
   * `waiting_for_input` is only ever produced by the `waitForInput` step type.
   *
   * Defence-in-depth `must_not` on `finishedAt`: if a race between the
   * workflow-level timeout monitor and the waitForInput step leaves a doc with
   * `status: waiting_for_input` AND `finishedAt` set (the step is actually
   * settled), we must not resurface it in the Inbox — responding to it is a
   * no-op because the execution doc is terminal. The underlying race is fixed
   * in `WaitForInputStepImpl`, but this keeps the Inbox honest even for
   * pre-existing zombie docs or any future regression.
   *
   * Orphan filtering: `.workflows-step-executions` is NOT transactionally
   * cleaned up when a workflow is soft-deleted (see `workflow_deletion.ts`
   * — only hard-deletes call `deleteByQuery`). Without a join the Inbox
   * would surface ghost actions for workflows the user has already removed
   * from `/app/workflows`. We do this as a list-time filter rather than a
   * delete-time cancel so soft-deletes stay reversible (step executions
   * resurface if the workflow is restored) and so pre-existing orphans get
   * cleaned up retroactively.
   */
  async listWaitingForInputSteps(
    spaceId: string,
    { page = 1, perPage = 100 }: { page?: number; perPage?: number } = {}
  ): Promise<WaitForInputListResult> {
    const from = Math.max(0, (page - 1) * perPage);
    let response: estypes.SearchResponse<EsWorkflowStepExecution>;
    try {
      response = await this.deps.esClient.search<EsWorkflowStepExecution>({
        index: WORKFLOWS_STEP_EXECUTIONS_INDEX,
        query: {
          bool: {
            must: [{ term: { spaceId } }, { term: { status: 'waiting_for_input' } }],
            // A step doc with `hitl.respondedAt` set has already received
            // a response — Task Manager simply hasn't run the resume yet.
            // Filter those out of pending so the row drops from the
            // user's "needs my action" list the moment they submit. The
            // processed listing picks them up immediately so the audit
            // feed populates with no perceptible gap, and the row will
            // settle out of the responded-but-not-resumed window once
            // the engine writes `finishedAt`.
            must_not: [
              { exists: { field: 'finishedAt' } },
              { exists: { field: 'hitl.respondedAt' } },
            ],
          },
        },
        sort: [{ startedAt: { order: 'desc' } }],
        from,
        size: perPage,
        track_total_hits: true,
      });
    } catch (error) {
      if (isIndexNotFoundError(error)) {
        return {
          results: [],
          total: 0,
          reasoningByStepId: new Map(),
          deletedWorkflowIds: new Set(),
        };
      }
      this.deps.logger.error(`Failed to list waiting-for-input step executions: ${error}`);
      throw error;
    }

    const total =
      typeof response.hits.total === 'number'
        ? response.hits.total
        : response.hits.total?.value ?? 0;

    const allResults = response.hits.hits
      .map((hit) => hit._source)
      .filter((src): src is EsWorkflowStepExecution => Boolean(src));

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

    const aliveIds = await this.getAliveWorkflowIds(distinctWorkflowIds, spaceId);

    if (aliveIds === null) {
      // Lookup itself failed (already logged). Fall back to unfiltered
      // results so a transient ES error doesn't black-hole the Inbox.
      return {
        results: allResults,
        total,
        reasoningByStepId: await this.resolvePredecessorReasoning(allResults, spaceId),
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
      reasoningByStepId: await this.resolvePredecessorReasoning(results, spaceId),
      // Pending drops orphans outright (you can't respond to a step whose
      // workflow is gone), so no surviving row is ever from a deleted parent.
      deletedWorkflowIds: new Set(),
    };
  }

  /**
   * Cross-workflow fan-out for terminated `waitForInput` step executions in a
   * space — i.e. steps that have already received a response (or been
   * cancelled / errored out). Used by the Inbox plugin to render the
   * processed-actions audit log below the pending list.
   *
   * Filters by indexed `stepType: 'waitForInput'` (added to the step
   * execution mapping for this very purpose; pre-deploy terminated rows
   * therefore won't be queryable by this field — acceptable for a brand-new
   * feature). Status filter intentionally accepts `completed`, `failed` and
   * `cancelled` so the audit log still surfaces rows where the workflow
   * settled abnormally after a response was submitted.
   *
   * Unlike the pending listing, this does NOT orphan-filter: an audit trail
   * must retain processed rows even after their parent workflow is deleted.
   * Rows whose parent is no longer alive (soft-deleted, or hard-deleted and
   * thus absent) are kept and reported back via `deletedWorkflowIds` so the
   * caller can flag the source as gone.
   */
  async listProcessedWaitForInputSteps(
    spaceId: string,
    {
      page = 1,
      perPage = 25,
      q,
      channel,
      workflowId,
      respondedBy,
      sortOrder = 'desc',
    }: { page?: number; perPage?: number } & InboxHistoryFilters = {}
  ): Promise<WaitForInputListResult> {
    const from = Math.max(0, (page - 1) * perPage);
    const filterMust = buildHistoryFilterClauses({ channel, workflowId, respondedBy, q });
    let response: estypes.SearchResponse<EsWorkflowStepExecution>;
    try {
      response = await this.deps.esClient.search<EsWorkflowStepExecution>({
        index: WORKFLOWS_STEP_EXECUTIONS_INDEX,
        query: {
          bool: {
            must: [{ term: { spaceId } }, { term: { stepType: 'waitForInput' } }, ...filterMust],
            // A step belongs in the audit feed when it has either:
            //   (a) actually terminated (`finishedAt` + a terminal
            //       status — the engine resumed and ran the step body), or
            //   (b) been audit-stamped via `markStepAsResponded` but not
            //       yet resumed by Task Manager (`hitl.respondedAt` set,
            //       status still `waiting_for_input`). Surfacing (b)
            //       immediately is what makes the inbox feel multi-client
            //       safe — every responder sees the response land
            //       regardless of which Task Manager polled the resume task.
            should: [
              {
                bool: {
                  must: [
                    { exists: { field: 'finishedAt' } },
                    { terms: { status: ['completed', 'failed', 'cancelled'] } },
                  ],
                },
              },
              { exists: { field: 'hitl.respondedAt' } },
            ],
            minimum_should_match: 1,
          },
        },
        // `hitl.respondedAt` is set the moment a response arrives; for the
        // brief responded-but-not-resumed window it precedes
        // `finishedAt`. Sorting on it (with `finishedAt` as a tiebreak)
        // keeps the audit feed stable: the row's relative position
        // doesn't shift when the engine eventually writes `finishedAt`.
        sort: [
          { 'hitl.respondedAt': { order: sortOrder, missing: '_last' } },
          { finishedAt: { order: sortOrder, missing: '_last' } },
        ],
        from,
        size: perPage,
        track_total_hits: true,
      });
    } catch (error) {
      if (isIndexNotFoundError(error)) {
        return {
          results: [],
          total: 0,
          reasoningByStepId: new Map(),
          deletedWorkflowIds: new Set(),
        };
      }
      this.deps.logger.error(`Failed to list processed wait-for-input step executions: ${error}`);
      throw error;
    }

    const total =
      typeof response.hits.total === 'number'
        ? response.hits.total
        : response.hits.total?.value ?? 0;

    const allResults = response.hits.hits
      .map((hit) => hit._source)
      .filter((src): src is EsWorkflowStepExecution => Boolean(src));

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

    const aliveIds = await this.getAliveWorkflowIds(distinctWorkflowIds, spaceId);

    if (aliveIds === null) {
      return {
        results: allResults,
        total,
        reasoningByStepId: await this.resolvePredecessorReasoning(allResults, spaceId),
        deletedWorkflowIds: new Set(),
      };
    }

    // Unlike the pending listing, the audit feed does NOT drop rows whose
    // parent workflow is deleted — an audit trail must retain "what happened"
    // even for workflows that were later removed. We keep every row and
    // instead tag the ones whose parent is no longer alive so the UI can flag
    // the source as deleted. (Hard-deletes also purge step executions via
    // `deleteByQuery`, so in practice this set is dominated by soft-deletes,
    // whose step rows survive and remain reversible.)
    const deletedWorkflowIds = new Set(distinctWorkflowIds.filter((id) => !aliveIds.has(id)));
    return {
      results: allResults,
      total,
      reasoningByStepId: await this.resolvePredecessorReasoning(allResults, spaceId),
      deletedWorkflowIds,
    };
  }

  /**
   * Distinct-value buckets for the inbox-history filter dropdowns.
   *
   * Returns the top `channel` and `respondedBy` values across the space's
   * processed wait-for-input rows. The query baseline mirrors
   * {@link listProcessedWaitForInputSteps} (`spaceId` + `stepType:
   * 'waitForInput'` + the terminated-or-audit-stamped `should`) but
   * intentionally applies **no** user-supplied filter clauses — the
   * dropdowns must stay stable regardless of which other filters are
   * already toggled, otherwise selecting one option would silently
   * truncate the others' choices.
   *
   * Index-not-found is treated as an empty result (cold install). Other ES
   * errors are logged and rethrown so the caller can decide how to surface
   * them. Soft-deleted-parent filtering is intentionally skipped here so the
   * dropdown stays consistent with the history list endpoint, which RETAINS
   * rows whose parent workflow was deleted (it flags them rather than dropping
   * them — an audit trail must survive deletion). The bucket count is bounded
   * by the `terms` agg `size` cap.
   */
  async listProcessedWaitForInputFacets(
    spaceId: string,
    { maxBuckets = 50 }: { maxBuckets?: number } = {}
  ): Promise<InboxHistoryFacets> {
    let response: estypes.SearchResponse<EsWorkflowStepExecution, InboxHistoryFacetAggs>;
    try {
      response = await this.deps.esClient.search<EsWorkflowStepExecution, InboxHistoryFacetAggs>({
        index: WORKFLOWS_STEP_EXECUTIONS_INDEX,
        // `size: 0` — we only want the aggs, not the matching docs.
        size: 0,
        query: {
          bool: {
            must: [{ term: { spaceId } }, { term: { stepType: 'waitForInput' } }],
            should: [
              {
                bool: {
                  must: [
                    { exists: { field: 'finishedAt' } },
                    { terms: { status: ['completed', 'failed', 'cancelled'] } },
                  ],
                },
              },
              { exists: { field: 'hitl.respondedAt' } },
            ],
            minimum_should_match: 1,
          },
        },
        aggs: {
          channel: { terms: { field: 'hitl.channel', size: maxBuckets } },
          respondedBy: { terms: { field: 'hitl.respondedBy', size: maxBuckets } },
        },
        track_total_hits: false,
      });
    } catch (error) {
      if (isIndexNotFoundError(error)) {
        return { channel: [], respondedBy: [] };
      }
      this.deps.logger.error(`Failed to compute inbox-history filter facets: ${error}`);
      throw error;
    }

    return {
      channel: bucketsToFacet(response.aggregations?.channel?.buckets),
      respondedBy: bucketsToFacet(response.aggregations?.respondedBy?.buckets),
    };
  }

  /**
   * Soft-interface reasoning resolver. For a page of `waitForInput` step
   * executions, fetch the most-recent *completed* step that finished at or
   * before each wait step started (the work the workflow did right before
   * pausing) and, when that predecessor's `output` carries a `reasoning`
   * object, surface it keyed by the wait step's execution id.
   *
   * One batched ES search per page (`terms workflowRunId` + `status:
   * completed` + a `finishedAt <= maxWaitStart` upper bound). Ordering uses
   * timestamps, not `globalExecutionIndex`, because the step-exec mapping is
   * `dynamic: false` and those index fields aren't queryable/sortable; the
   * `output` blob is read from `_source` in memory (durable — output
   * eviction is memory-only, the persisted doc keeps the payload).
   *
   * Best-effort by construction: branches / parallel steps may yield a
   * sibling, and a predecessor without a `reasoning` key simply produces no
   * entry. Failures never propagate — reasoning is an enhancement, not a
   * prerequisite for the listing.
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

    let response: estypes.SearchResponse<EsWorkflowStepExecution>;
    try {
      response = await this.deps.esClient.search<EsWorkflowStepExecution>({
        index: WORKFLOWS_STEP_EXECUTIONS_INDEX,
        query: {
          bool: {
            must: [
              { term: { spaceId } },
              { terms: { workflowRunId: runIds } },
              { term: { status: 'completed' } },
              { range: { finishedAt: { lte: maxWaitStart } } },
            ],
          },
        },
        // Most-recent-first within each run so the first candidate at or
        // before a wait step's start is its immediate predecessor.
        sort: [
          { workflowRunId: { order: 'asc' } },
          { finishedAt: { order: 'desc', missing: '_last' } },
        ],
        _source: { includes: ['workflowRunId', 'finishedAt', 'output'] },
        size: PREDECESSOR_REASONING_MAX_HITS,
        track_total_hits: false,
      });
    } catch (error) {
      if (isIndexNotFoundError(error)) {
        return reasoningByStepId;
      }
      // Reasoning is a soft enhancement — never fail the listing because the
      // predecessor lookup errored. Log and return what we have (nothing).
      this.deps.logger.warn(`Failed to resolve predecessor reasoning for inbox listing: ${error}`);
      return reasoningByStepId;
    }

    const hits = response?.hits?.hits ?? [];
    const completedByRun = new Map<string, Array<{ finishedAt?: string; output?: unknown }>>();
    for (const hit of hits) {
      const source = hit._source;
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
        const predecessor = candidates.find(
          (candidate) =>
            typeof candidate.finishedAt === 'string' && candidate.finishedAt <= startedAt
        );
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
        `Failed to validate parent workflows for inbox listing; returning unfiltered results: ${error}`
      );
      return null;
    }
  }

  async getStepExecution(
    params: GetStepExecutionParams,
    spaceId: string
  ): Promise<EsWorkflowStepExecution | null> {
    const { executionId, id } = params;
    const response = await this.deps.esClient.search<EsWorkflowStepExecution>({
      index: WORKFLOWS_STEP_EXECUTIONS_INDEX,
      query: {
        bool: {
          must: [{ term: { workflowRunId: executionId } }, { term: { id } }, { term: { spaceId } }],
        },
      },
      size: 1,
      track_total_hits: false,
    });

    if (response.hits.hits.length === 0) {
      return null;
    }

    return response.hits.hits[0]._source ?? null;
  }

  /**
   * Synchronously records HITL audit metadata on the step execution doc
   * the moment a responder submits a response — *before* the engine's
   * Task Manager flow has a chance to run the resume.  Because the
   * fields land on the step row itself, every client (Kibana inbox,
   * Slack, agent builder, raw API) can detect the
   * "responded but not yet resumed" state simply by reading
   * `.workflows-step-executions`.  No per-client overlay state required.
   *
   * Refresh = `wait_for` so the immediate refetch on the inbox client
   * (after the respond mutation settles) sees the audit fields and can
   * render the "Responded" overlay without an extra round trip. The
   * latency is bounded — ES refresh interval applies once per shard.
   *
   * Returns `true` if the doc was updated, `false` if the doc was not
   * found, belongs to a different space, or was already claimed by another
   * responder. Throws on transport / ES errors so callers can decide whether
   * to retry.
   */
  async markStepAsResponded(
    stepExecutionId: string,
    audit: { respondedBy: string; respondedAt: string; channel: string },
    spaceId: string
  ): Promise<boolean> {
    try {
      const response = await this.deps.esClient.update({
        index: WORKFLOWS_STEP_EXECUTIONS_INDEX,
        id: stepExecutionId,
        // Scripted update guarded on `spaceId` so a misrouted call can't
        // stamp audit fields on the wrong space's doc. In practice the
        // caller (workflows inbox provider) has already verified the
        // step belongs to the active space, but treating the index as
        // append-mostly + space-scoped at every write is cheap defence.
        // The `respondedAt` guard makes this a first-writer-wins claim:
        // concurrent responders cannot overwrite the audit identity/channel
        // after another client has already submitted a response.
        //
        // The painless guard only resolves *sequential* races (the second
        // responder reads a doc that already has `respondedAt`). For two
        // *simultaneous* updates, both read the same `_seq_no` before either
        // writes, so the loser's write fails with a version conflict. Without
        // a retry that surfaces as a raw 409 the route can't classify (→ 500).
        // `retry_on_conflict` makes ES re-read the now-stamped doc and re-run
        // the script, which then takes the noop branch — so the loser
        // deterministically returns `false` and the provider can raise a clean
        // `InboxActionConflictError` (→ 409) instead of a generic 500.
        retry_on_conflict: 3,
        script: {
          source:
            'if (ctx._source.spaceId != params.spaceId) { ctx.op = "noop"; }' +
            'else {' +
            '  if (ctx._source.hitl != null && ctx._source.hitl.respondedAt != null) { ctx.op = "noop"; }' +
            '  else {' +
            '    if (ctx._source.hitl == null) { ctx._source.hitl = [:]; }' +
            '    ctx._source.hitl.respondedBy = params.respondedBy;' +
            '    ctx._source.hitl.respondedAt = params.respondedAt;' +
            '    ctx._source.hitl.channel = params.channel;' +
            '  }' +
            '}',
          lang: 'painless',
          params: {
            spaceId,
            respondedBy: audit.respondedBy,
            respondedAt: audit.respondedAt,
            channel: audit.channel,
          },
        },
        refresh: 'wait_for',
      });
      return response.result !== 'noop';
    } catch (error) {
      if (
        error?.statusCode === 404 ||
        error?.meta?.body?.result === 'not_found' ||
        error?.body?.result === 'not_found'
      ) {
        // Step doc is gone — workflow likely already terminated. The
        // pre-respond conflict check should have caught this; reaching
        // here means a race (e.g. timeout monitor flipped status during
        // the response). Surface as a soft "no-op" so the caller can
        // decide.
        return false;
      }
      this.deps.logger.error(
        `Failed to mark step execution ${stepExecutionId} as responded: ${error}`
      );
      throw error;
    }
  }
}

/**
 * Translate the inbox-history filter shape into the `must` clause additions
 * the listing query layers on top of its baseline `spaceId` + `stepType`
 * filters. Each filter is independent and AND'd into the must list — the
 * OpenAPI contract documents multi-value within-field as OR (which `terms`
 * honours) and cross-field as AND.
 */
function buildHistoryFilterClauses({
  channel,
  workflowId,
  respondedBy,
  q,
}: InboxHistoryFilters): estypes.QueryDslQueryContainer[] {
  const filterMust: estypes.QueryDslQueryContainer[] = [];
  if (channel && channel.length > 0) {
    filterMust.push({ terms: { 'hitl.channel': channel } });
  }
  if (workflowId && workflowId.length > 0) {
    filterMust.push({ terms: { workflowId } });
  }
  if (respondedBy && respondedBy.length > 0) {
    filterMust.push({ terms: { 'hitl.respondedBy': respondedBy } });
  }
  if (q && q.length > 0) {
    // Free-text search applied to the indexed string fields most useful for
    // narrowing the audit feed (responder, workflow id, step id). All three
    // are mapped as `keyword`, so `match` / `phrase_prefix` would only match
    // when the doc's entire keyword starts with the exact query — typing
    // `test_user` would miss `test_user_alice`. We instead OR a
    // case-insensitive substring `wildcard` against each field, after
    // escaping the ES wildcard metacharacters in the user input so a literal
    // `*` or `?` can't escape into the query. Wildcard performance is
    // acceptable here because the feed is space-scoped and already bounded by
    // the `terms`/`bool` filters earlier in the request.
    const escaped = escapeWildcardOperators(q);
    filterMust.push({
      bool: {
        should: ['hitl.respondedBy', 'workflowId', 'stepId'].map((field) => ({
          wildcard: {
            [field]: {
              value: `*${escaped}*`,
              case_insensitive: true,
            },
          },
        })),
        minimum_should_match: 1,
      },
    });
  }
  return filterMust;
}

/**
 * Escape the two characters Elasticsearch interprets as wildcards (`*` and
 * `?`) so a literal `?` or `*` typed by the user is matched verbatim rather
 * than expanding inside our `*term*` envelope. The backslash itself is
 * doubled because ES wildcard syntax already uses `\` for escaping.
 */
function escapeWildcardOperators(input: string): string {
  return input.replace(/[\\*?]/g, (char) => `\\${char}`);
}

/**
 * Pull the soft-interface `reasoning` object out of a step's `output`, if
 * present. Returns `undefined` unless `output` is a plain object carrying a
 * plain-object `reasoning` value — the contract is intentionally loose
 * (extra keys tolerated) but we never surface a non-object reasoning blob.
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

/**
 * Convert ES `terms` agg buckets into the inbox-common facet shape. Buckets
 * with non-string keys (a defensive guard — our fields are keyword-typed)
 * and empty-string values are dropped. The agg already returns descending
 * count order; we don't re-sort.
 */
function bucketsToFacet(
  buckets: estypes.AggregationsStringTermsAggregate['buckets'] | undefined
): Array<{ value: string; count: number }> {
  if (!buckets || !Array.isArray(buckets)) {
    return [];
  }
  return buckets
    .map((bucket) => ({
      value: typeof bucket.key === 'string' ? bucket.key : String(bucket.key ?? ''),
      count: bucket.doc_count,
    }))
    .filter((entry) => entry.value.length > 0);
}
