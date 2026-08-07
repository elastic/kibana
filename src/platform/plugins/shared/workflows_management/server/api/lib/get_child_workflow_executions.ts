/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isExecuteSyncStepType, isTerminalStatus } from '@kbn/workflows';
import type {
  ChildWorkflowExecutionItem,
  EsWorkflowExecution,
  EsWorkflowStepExecution,
  WorkflowStepExecutionDto,
} from '@kbn/workflows';
import type {
  GetWorkflowExecutionsByIdsOptions,
  StepExecutionsDataClient,
  WorkflowExecutionsDataClient,
} from '@kbn/workflows-execution-engine/server';
import { getStepExecutionsByWorkflowExecution } from '@kbn/workflows-execution-engine/server';

interface GetChildWorkflowExecutionsParams {
  workflowExecutionsDataClient: WorkflowExecutionsDataClient;
  stepExecutionsDataClient: StepExecutionsDataClient;
  parentExecutionId: string;
  spaceId: string;
}

interface ChildRef {
  stepExecutionId: string;
  childExecutionId: string;
}

const STEP_SOURCE_EXCLUDES: (keyof EsWorkflowStepExecution)[] = ['input', 'output'];
const PARENT_SOURCE_INCLUDES: (keyof EsWorkflowExecution)[] = ['spaceId', 'stepExecutionIds'];
const CHILD_SOURCE_INCLUDES = [
  'id',
  'spaceId',
  'workflowId',
  'workflowDefinition.name',
  'status',
  'stepExecutionIds',
] as GetWorkflowExecutionsByIdsOptions['sourceIncludes'];

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
  workflowExecutionsDataClient: WorkflowExecutionsDataClient,
  childIds: string[],
  spaceId: string
): Promise<Map<string, EsWorkflowExecution>> => {
  const { items } = await workflowExecutionsDataClient.getByIds(childIds, {
    sourceIncludes: CHILD_SOURCE_INCLUDES,
  });

  const result = new Map<string, EsWorkflowExecution>();
  for (const { document: doc } of items) {
    if (doc.spaceId === spaceId) {
      result.set(doc.id, doc);
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
  workflowExecutionsDataClient,
  stepExecutionsDataClient,
  parentExecutionId,
  spaceId,
}: GetChildWorkflowExecutionsParams): Promise<ChildWorkflowExecutionItem[]> => {
  const { items: parentItems, missing: parentMissing } =
    await workflowExecutionsDataClient.getByIds([parentExecutionId], {
      sourceIncludes: [...PARENT_SOURCE_INCLUDES],
    });

  // Throw so callers can distinguish "parent doesn't exist" from "parent has no
  // child executions" — both cases would otherwise silently return [].
  if (parentMissing.includes(parentExecutionId)) {
    throw new Error(`Workflow execution not found: ${parentExecutionId}`);
  }

  const parentDoc = parentItems[0]?.document;

  if (!parentDoc || parentDoc.spaceId !== spaceId) {
    return [];
  }

  const parentStepExecutions = await getStepExecutionsByWorkflowExecution({
    stepExecutionsDataClient,
    workflowExecutionId: parentExecutionId,
    stepExecutionIds: parentDoc.stepExecutionIds,
    sourceExcludes: STEP_SOURCE_EXCLUDES,
  });

  const childRefs = extractChildRefs(parentStepExecutions);
  if (childRefs.length === 0) {
    return [];
  }

  const childDocMap = await fetchChildDocs(
    workflowExecutionsDataClient,
    childRefs.map((ref) => ref.childExecutionId),
    spaceId
  );

  const allChildStepExecutionIds = Array.from(childDocMap.values()).flatMap(
    (doc) => doc.stepExecutionIds ?? []
  );

  const childStepExecutions =
    allChildStepExecutionIds.length > 0
      ? await getStepExecutionsByWorkflowExecution({
          stepExecutionsDataClient,
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
