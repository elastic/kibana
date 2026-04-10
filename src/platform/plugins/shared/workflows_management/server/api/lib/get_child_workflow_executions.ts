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
  const mgetResponse = await esClient.mget<EsWorkflowExecution>({
    docs: childIds.map((id) => ({ _index: workflowExecutionIndex, _id: id })),
    _source_includes: CHILD_SOURCE_INCLUDES,
  });

  const result = new Map<string, EsWorkflowExecution>();
  for (const d of mgetResponse.docs) {
    if ('found' in d && d.found) {
      const doc = d._source as EsWorkflowExecution;
      if (doc.spaceId === spaceId) {
        result.set(d._id, doc);
      }
    }
  }
  return result;
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
  const response = await esClient.get<EsWorkflowExecution>({
    index: workflowExecutionIndex,
    id: parentExecutionId,
    _source_includes: PARENT_SOURCE_INCLUDES,
  });
  const parentDoc = response._source ?? undefined;

  if (!parentDoc || parentDoc.spaceId !== spaceId) {
    return [];
  }

  const parentStepExecutions = await getStepExecutionsByWorkflowExecution({
    esClient,
    stepsExecutionIndex,
    workflowExecutionId: parentExecutionId,
    stepExecutionIds: parentDoc.stepExecutionIds,
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

  const allChildStepExecutionIds = Array.from(childDocMap.values()).flatMap(
    (doc) => doc.stepExecutionIds ?? []
  );

  const childStepExecutions =
    allChildStepExecutionIds.length > 0
      ? await getStepExecutionsByWorkflowExecution({
          esClient,
          stepsExecutionIndex,
          workflowExecutionId: '',
          stepExecutionIds: allChildStepExecutionIds,
          sourceExcludes: STEP_SOURCE_EXCLUDES,
        })
      : [];

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
