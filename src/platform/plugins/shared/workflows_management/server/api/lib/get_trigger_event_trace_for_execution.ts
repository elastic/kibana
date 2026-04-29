/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type {
  WorkflowExecutionDto,
  WorkflowTriggerEventChainLinkDto,
  WorkflowTriggerEventDispatchDto,
  WorkflowTriggerEventTraceResponseDto,
} from '@kbn/workflows';
import { isEventDrivenWorkflowTriggerSource } from '@kbn/workflows';
import { WORKFLOWS_EVENTS_INDEX } from '../../../common';

/** Safety cap independent of engine config (prevents runaway ES/user lookups). */
const MAX_CAUSAL_CHAIN_HOPS = 25;

function getWorkflowDisplayName(
  execution: WorkflowExecutionDto | null | undefined
): string | undefined {
  if (!execution) {
    return undefined;
  }
  const name = execution.workflowName ?? execution.workflowDefinition?.name;
  return typeof name === 'string' && name.length > 0 ? name : undefined;
}

function mapSourceToDispatch(source: Record<string, unknown>): WorkflowTriggerEventDispatchDto {
  const subscriptionsRaw = source.subscriptions;
  const subscriptions = Array.isArray(subscriptionsRaw)
    ? subscriptionsRaw.filter((s): s is string => typeof s === 'string')
    : [];
  const payloadRaw = source.payload;
  const payload =
    typeof payloadRaw === 'object' && payloadRaw !== null && !Array.isArray(payloadRaw)
      ? (payloadRaw as Record<string, unknown>)
      : {};

  const out: WorkflowTriggerEventDispatchDto = {
    '@timestamp': String(source['@timestamp'] ?? ''),
    eventId: String(source.eventId ?? ''),
    triggerId: String(source.triggerId ?? ''),
    spaceId: String(source.spaceId ?? ''),
    subscriptions,
    payload,
  };

  if (typeof source.sourceExecutionId === 'string' && source.sourceExecutionId.length > 0) {
    return { ...out, sourceExecutionId: source.sourceExecutionId };
  }

  return out;
}

function getDispatchEventIdFromExecution(execution: WorkflowExecutionDto): string | null {
  const metadata = execution.context?.metadata as Record<string, unknown> | undefined;
  const fromMetadata =
    metadata && typeof metadata.eventId === 'string' ? metadata.eventId.trim() : '';
  const fromTop =
    typeof execution.dispatchEventId === 'string' ? execution.dispatchEventId.trim() : '';
  const id = fromTop || fromMetadata;
  return id.length > 0 ? id : null;
}

async function fetchDispatchByEventId(
  esClient: ElasticsearchClient,
  spaceId: string,
  eventId: string
): Promise<WorkflowTriggerEventDispatchDto | null> {
  const dispatchResult = await esClient.search({
    index: WORKFLOWS_EVENTS_INDEX,
    ignore_unavailable: true,
    size: 1,
    track_total_hits: false,
    query: {
      bool: {
        filter: [{ term: { spaceId } }, { term: { eventId } }],
      },
    },
    sort: [{ '@timestamp': { order: 'desc' } }],
  });

  const dispatchSource = dispatchResult.hits.hits[0]?._source as
    | Record<string, unknown>
    | undefined;
  return dispatchSource ? mapSourceToDispatch(dispatchSource) : null;
}

async function buildEventCausalChain(params: {
  esClient: ElasticsearchClient;
  spaceId: string;
  initialDispatch: WorkflowTriggerEventDispatchDto | null;
  currentExecution: WorkflowExecutionDto;
  getWorkflowExecution: GetTriggerEventTraceForExecutionParams['getWorkflowExecution'];
}): Promise<WorkflowTriggerEventChainLinkDto[]> {
  const { esClient, spaceId, initialDispatch, currentExecution, getWorkflowExecution } = params;

  if (!initialDispatch) {
    return [];
  }

  const collected: WorkflowTriggerEventChainLinkDto[] = [];
  let dispatchDoc: WorkflowTriggerEventDispatchDto | null = initialDispatch;
  let triggeredExecId = currentExecution.id;

  while (dispatchDoc !== null && collected.length < MAX_CAUSAL_CHAIN_HOPS) {
    const triggeredExec = await getWorkflowExecution(triggeredExecId, spaceId, {
      includeInput: false,
      includeOutput: false,
    });

    let emittedByExecution:
      | { workflowId: string; executionId: string; workflowName?: string }
      | undefined;
    if (dispatchDoc.sourceExecutionId) {
      const emitter = await getWorkflowExecution(dispatchDoc.sourceExecutionId, spaceId, {
        includeInput: false,
        includeOutput: false,
      });
      if (emitter?.workflowId) {
        const workflowName = getWorkflowDisplayName(emitter);
        emittedByExecution = {
          executionId: dispatchDoc.sourceExecutionId,
          workflowId: emitter.workflowId,
          ...(workflowName ? { workflowName } : {}),
        };
      }
    }

    const triggeredWorkflowName = getWorkflowDisplayName(triggeredExec);

    collected.push({
      dispatch: dispatchDoc,
      triggeredExecutionId: triggeredExecId,
      triggeredWorkflowId: triggeredExec?.workflowId ?? '',
      ...(triggeredWorkflowName ? { triggeredWorkflowName } : {}),
      ...(emittedByExecution ? { emittedByExecution } : {}),
    });

    const emitterExecId = dispatchDoc.sourceExecutionId;
    if (!emitterExecId) {
      break;
    }

    const emitterExec = await getWorkflowExecution(emitterExecId, spaceId, {
      includeInput: false,
      includeOutput: false,
    });
    if (!emitterExec) {
      break;
    }

    const parentDispatchId = getDispatchEventIdFromExecution(emitterExec);
    if (!parentDispatchId) {
      break;
    }

    const parentDispatch = await fetchDispatchByEventId(esClient, spaceId, parentDispatchId);
    if (!parentDispatch) {
      break;
    }

    triggeredExecId = emitterExecId;
    dispatchDoc = parentDispatch;
  }

  return collected.reverse();
}

export interface GetTriggerEventTraceForExecutionParams {
  esClient: ElasticsearchClient;
  logger: Logger;
  execution: WorkflowExecutionDto;
  spaceId: string;
  getWorkflowExecution: (
    id: string,
    sid: string,
    opts?: { includeInput?: boolean; includeOutput?: boolean }
  ) => Promise<WorkflowExecutionDto | null>;
}

export async function getTriggerEventTraceForExecution({
  esClient,
  logger,
  execution,
  spaceId,
  getWorkflowExecution,
}: GetTriggerEventTraceForExecutionParams): Promise<WorkflowTriggerEventTraceResponseDto> {
  const ineligible: WorkflowTriggerEventTraceResponseDto = {
    eligible: false,
    dispatchEventId: null,
    dispatch: null,
    eventCausalChain: [],
    downstreamDispatches: [],
  };

  if (!isEventDrivenWorkflowTriggerSource(execution.triggeredBy)) {
    return ineligible;
  }

  const dispatchEventId = getDispatchEventIdFromExecution(execution);

  if (!dispatchEventId) {
    return {
      eligible: true,
      dispatchEventId: null,
      dispatch: null,
      eventCausalChain: [],
      downstreamDispatches: [],
      missingDispatchEventId: true,
    };
  }

  try {
    const dispatch = await fetchDispatchByEventId(esClient, spaceId, dispatchEventId);

    const eventCausalChain = await buildEventCausalChain({
      esClient,
      spaceId,
      initialDispatch: dispatch,
      currentExecution: execution,
      getWorkflowExecution,
    });

    let parentExecution: { workflowId: string; executionId: string } | undefined;
    if (dispatch?.sourceExecutionId) {
      const parent = await getWorkflowExecution(dispatch.sourceExecutionId, spaceId, {
        includeInput: false,
        includeOutput: false,
      });
      if (parent?.workflowId) {
        parentExecution = {
          executionId: dispatch.sourceExecutionId,
          workflowId: parent.workflowId,
        };
      }
    }

    const downstreamResult = await esClient.search({
      index: WORKFLOWS_EVENTS_INDEX,
      ignore_unavailable: true,
      size: 50,
      track_total_hits: false,
      query: {
        bool: {
          filter: [{ term: { spaceId } }, { term: { sourceExecutionId: execution.id } }],
        },
      },
      sort: [{ '@timestamp': { order: 'desc' } }],
    });

    const downstreamDispatches: WorkflowTriggerEventDispatchDto[] = [];
    for (const hit of downstreamResult.hits.hits) {
      const src = hit._source as Record<string, unknown> | undefined;
      if (src) {
        downstreamDispatches.push(mapSourceToDispatch(src));
      }
    }

    const result: WorkflowTriggerEventTraceResponseDto = {
      eligible: true,
      dispatchEventId,
      dispatch,
      eventCausalChain,
      downstreamDispatches,
    };

    if (parentExecution) {
      result.parentExecution = parentExecution;
    }

    return result;
  } catch (error) {
    logger.warn(`Failed to load trigger event trace: ${error}`);
    return {
      eligible: true,
      dispatchEventId,
      dispatch: null,
      eventCausalChain: [],
      downstreamDispatches: [],
      fetchError: error instanceof Error ? error.message : String(error),
    };
  }
}
