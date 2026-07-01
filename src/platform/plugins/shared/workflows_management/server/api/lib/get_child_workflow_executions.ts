/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { isExecuteSyncStepType, isTerminalStatus } from '@kbn/workflows';
import type {
  ChildWorkflowExecutionItem,
  EsWorkflowExecution,
  EsWorkflowStepExecution,
  WorkflowStepExecutionDto,
} from '@kbn/workflows';
import { getStepExecutionsByWorkflowExecution } from '@kbn/workflows/server';
import {
  getExecutionByIdFromDataStream,
  getStepExecutionsByIdsFromDataStream,
} from './execution_data_stream_reads';

interface GetChildWorkflowExecutionsParams {
  esClient: ElasticsearchClient;
  workflowExecutionIndex: string;
  stepsExecutionIndex: string;
  parentExecutionId: string;
  spaceId: string;
}

interface ChildRef {
  stepExecutionId: string;
  childExecutionId: string;
}

const STEP_SOURCE_EXCLUDES = ['input', 'output'];
const PARENT_SOURCE_INCLUDES = ['spaceId', 'stepExecutionIds'];
const CHILD_SOURCE_INCLUDES = [
  'spaceId',
  'workflowId',
  'workflowDefinition.name',
  'status',
  'stepExecutionIds',
];

const extractChildRefs = (steps: EsWorkflowStepExecution[]): ChildRef[] =>
  steps
    .filter(
      (step) =>
        isExecuteSyncStepType(step.stepType) &&
        isTerminalStatus(step.status) &&
        typeof step.state?.executionId === 'string'
    )
    .map((step) => ({
      stepExecutionId: step.id,
      childExecutionId: String(step.state?.executionId),
    }));

const fetchChildDocs = async (
  esClient: ElasticsearchClient,
  workflowExecutionIndex: string,
  childIds: string[],
  spaceId: string
): Promise<Map<string, EsWorkflowExecution>> => {
  const result = new Map<string, EsWorkflowExecution>();
  await Promise.all(
    childIds.map(async (id) => {
      const doc = await getExecutionByIdFromDataStream({
        esClient,
        dataStream: workflowExecutionIndex,
        id,
        spaceId,
        sourceIncludes: CHILD_SOURCE_INCLUDES,
      });
      if (doc) {
        result.set(id, doc);
      }
    })
  );
  return result;
};

const fetchChildStepExecutions = async ({
  esClient,
  stepsExecutionIndexAlias,
  childDocMap,
  sourceExcludes,
}: {
  esClient: ElasticsearchClient;
  stepsExecutionIndexAlias: string;
  childDocMap: Map<string, EsWorkflowExecution>;
  sourceExcludes: string[];
}): Promise<EsWorkflowStepExecution[]> => {
  const childStepExecutions: EsWorkflowStepExecution[] = [];

  for (const doc of childDocMap.values()) {
    const stepExecutionIds = doc.stepExecutionIds ?? [];
    const steps =
      stepExecutionIds.length > 0
        ? await getStepExecutionsByIdsFromDataStream({
            esClient,
            dataStream: stepsExecutionIndexAlias,
            ids: stepExecutionIds,
            sourceExcludes,
          })
        : await getStepExecutionsByWorkflowExecution({
            esClient,
            stepsExecutionIndexAlias,
            workflowExecutionId: doc.id,
            sourceExcludes,
          });
    childStepExecutions.push(...steps);
  }

  return childStepExecutions;
};

const groupStepsByWorkflowRunId = (
  steps: EsWorkflowStepExecution[]
): Map<string, WorkflowStepExecutionDto[]> => {
  const result = new Map<string, WorkflowStepExecutionDto[]>();
  for (const step of steps) {
    const { spaceId: _spaceId, ...dto } = step;
    const list = result.get(step.workflowRunId) ?? [];
    list.push(dto);
    result.set(step.workflowRunId, list);
  }
  return result;
};

export const getChildWorkflowExecutions = async ({
  esClient,
  workflowExecutionIndex,
  stepsExecutionIndex,
  parentExecutionId,
  spaceId,
}: GetChildWorkflowExecutionsParams): Promise<ChildWorkflowExecutionItem[]> => {
  const parentDoc = await getExecutionByIdFromDataStream({
    esClient,
    dataStream: workflowExecutionIndex,
    id: parentExecutionId,
    spaceId,
    sourceIncludes: PARENT_SOURCE_INCLUDES,
  });

  if (!parentDoc || parentDoc.spaceId !== spaceId) {
    return [];
  }

  const parentStepExecutions = await getStepExecutionsByIdsFromDataStream({
    esClient,
    dataStream: stepsExecutionIndex,
    ids: parentDoc.stepExecutionIds ?? [],
    sourceExcludes: STEP_SOURCE_EXCLUDES,
  });

  const childRefs = extractChildRefs(parentStepExecutions);
  if (childRefs.length === 0) {
    return [];
  }

  const childDocMap = await fetchChildDocs(
    esClient,
    workflowExecutionIndex,
    childRefs.map((ref) => ref.childExecutionId),
    spaceId
  );

  const childStepExecutions = await fetchChildStepExecutions({
    esClient,
    stepsExecutionIndexAlias: stepsExecutionIndex,
    childDocMap,
    sourceExcludes: STEP_SOURCE_EXCLUDES,
  });

  const stepsByRunId = groupStepsByWorkflowRunId(childStepExecutions);

  return childRefs.flatMap((ref) => {
    const doc = childDocMap.get(ref.childExecutionId);
    if (!doc) return [];
    return [
      {
        parentStepExecutionId: ref.stepExecutionId,
        workflowId: doc.workflowId ?? '',
        workflowName: doc.workflowDefinition?.name ?? '',
        executionId: ref.childExecutionId,
        status: doc.status,
        stepExecutions: stepsByRunId.get(ref.childExecutionId) ?? [],
      },
    ];
  });
};
