/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isExecuteSyncStepType } from '@kbn/workflows';
import type {
  ChildWorkflowExecutionItem,
  EsWorkflowExecution,
  EsWorkflowStepExecution,
  WorkflowStepExecutionDto,
} from '@kbn/workflows';
import type { ExecutionReadDeps, GetChildExecutionsParams } from './types';
import type { GetWorkflowExecutionsByIdsOptions } from '../repositories/data_access_layer';
import { getStepExecutionsByWorkflowExecution } from '../repositories/data_access_layer/lib/get_step_executions_by_workflow_execution';

const STEP_SOURCE_EXCLUDES: Array<keyof EsWorkflowStepExecution> = ['input', 'output'];
const PARENT_SOURCE_INCLUDES: Array<keyof EsWorkflowExecution> = ['spaceId', 'stepExecutionIds'];
const CHILD_SOURCE_INCLUDES = [
  'id',
  'spaceId',
  'workflowId',
  'workflowDefinition.name',
  'status',
  'stepExecutionIds',
] as GetWorkflowExecutionsByIdsOptions['sourceIncludes'];

const extractChildRefs = (
  steps: EsWorkflowStepExecution[]
): Array<{ stepExecutionId: string; childExecutionId: string }> =>
  steps
    .filter(
      (step) => isExecuteSyncStepType(step.stepType) && typeof step.state?.executionId === 'string'
    )
    .map((step) => ({
      stepExecutionId: step.id,
      childExecutionId: String(step.state?.executionId),
    }));

/**
 * Returns child runs started by sync-execute steps of a parent run, without step input or output.
 * Throws when the parent document does not exist. A parent in another space, or a parent with no
 * child links, returns an empty list.
 */
export const getChildExecutions = async (
  deps: ExecutionReadDeps,
  { parentExecutionId, spaceId }: GetChildExecutionsParams
): Promise<ChildWorkflowExecutionItem[]> => {
  const { items: parentItems, missing: parentMissing } =
    await deps.workflowExecutionsDataClient.getByIds([parentExecutionId], {
      sourceIncludes: [...PARENT_SOURCE_INCLUDES],
    });

  if (parentMissing.includes(parentExecutionId)) {
    throw new Error(`Workflow execution not found: ${parentExecutionId}`);
  }

  const parentDoc = parentItems[0]?.document;
  if (!parentDoc || parentDoc.spaceId !== spaceId) {
    return [];
  }

  const parentStepExecutions = await getStepExecutionsByWorkflowExecution({
    stepExecutionsDataClient: deps.stepExecutionsDataClient,
    workflowExecutionId: parentExecutionId,
    stepExecutionIds: parentDoc.stepExecutionIds,
    sourceExcludes: STEP_SOURCE_EXCLUDES,
  });

  const childRefs = extractChildRefs(parentStepExecutions);
  if (childRefs.length === 0) {
    return [];
  }

  const { items } = await deps.workflowExecutionsDataClient.getByIds(
    childRefs.map((ref) => ref.childExecutionId),
    { sourceIncludes: CHILD_SOURCE_INCLUDES }
  );
  const childDocMap = new Map<string, EsWorkflowExecution>();
  for (const { document: doc } of items) {
    if (doc.spaceId === spaceId) {
      childDocMap.set(doc.id, doc);
    }
  }

  const allChildStepExecutionIds = Array.from(childDocMap.values()).flatMap(
    (doc) => doc.stepExecutionIds ?? []
  );
  const childStepExecutions =
    allChildStepExecutionIds.length > 0
      ? await getStepExecutionsByWorkflowExecution({
          stepExecutionsDataClient: deps.stepExecutionsDataClient,
          workflowExecutionId: '',
          stepExecutionIds: allChildStepExecutionIds,
          sourceExcludes: STEP_SOURCE_EXCLUDES,
        })
      : [];

  const stepsByRunId = new Map<string, WorkflowStepExecutionDto[]>();
  for (const step of childStepExecutions) {
    const { spaceId: _spaceId, ...dto } = step;
    const list = stepsByRunId.get(step.workflowRunId) ?? [];
    list.push(dto);
    stepsByRunId.set(step.workflowRunId, list);
  }

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
