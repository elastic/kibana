/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsWorkflowExecution, EsWorkflowStepExecution } from '@kbn/workflows';
import type {
  StepExecutionsDataClient,
  WorkflowExecutionsDataClient,
} from '@kbn/workflows-execution-engine/server';
import { getStepExecutionsByWorkflowExecution } from '@kbn/workflows-execution-engine/server';

/** Matches the descendant-merge guard: deeper than any nesting the editor allows. */
const MAX_FAMILY_DEPTH = 20;

const EXECUTION_SOURCE_INCLUDES = [
  'id',
  'spaceId',
  'parentExecutionId',
  'stepExecutionIds',
] as (keyof EsWorkflowExecution)[];

interface AncestryParams {
  workflowExecutionsDataClient: WorkflowExecutionsDataClient;
  spaceId: string;
}

/**
 * True when `executionId` is `rootExecutionId` or one of its descendants.
 *
 * A parallel branch runs as its own execution, so a step the UI addresses under
 * a run's id may physically belong to a branch execution beneath it. Routes
 * authorize against the whole family rather than an exact `workflowRunId` match,
 * which would otherwise 404 every branch step.
 */
export const isInExecutionFamily = async (
  { workflowExecutionsDataClient, spaceId }: AncestryParams,
  executionId: string,
  rootExecutionId: string
): Promise<boolean> => {
  let currentId: string | undefined = executionId;

  for (let depth = 0; currentId && depth <= MAX_FAMILY_DEPTH; depth++) {
    if (currentId === rootExecutionId) {
      return true;
    }

    const { items } = await workflowExecutionsDataClient.getByIds([currentId], {
      sourceIncludes: EXECUTION_SOURCE_INCLUDES,
    });
    const document = items[0]?.document;
    if (!document || document.spaceId !== spaceId) {
      return false;
    }
    currentId = document.parentExecutionId;
  }

  return false;
};

interface FamilyIdsParams extends AncestryParams {
  stepExecutionsDataClient: StepExecutionsDataClient;
}

/**
 * Every execution a run's work is spread across: the run itself plus, through
 * its `hasChildExecution` wrapper steps, each parallel branch beneath it.
 *
 * Resolved by mget alone (a wrapper step's id *is* its child's execution id), so
 * it stays correct for a run still in flight, before the index has refreshed.
 */
export const collectExecutionFamilyIds = async (
  { workflowExecutionsDataClient, stepExecutionsDataClient, spaceId }: FamilyIdsParams,
  rootExecutionId: string
): Promise<string[]> => {
  const familyIds = [rootExecutionId];
  let frontier = [rootExecutionId];

  for (let depth = 0; frontier.length > 0 && depth < MAX_FAMILY_DEPTH; depth++) {
    const { items } = await workflowExecutionsDataClient.getByIds(frontier, {
      sourceIncludes: EXECUTION_SOURCE_INCLUDES,
    });
    const stepExecutionIds = items
      .map(({ document }) => document)
      .filter((document) => document?.spaceId === spaceId)
      .flatMap((document) => document.stepExecutionIds ?? []);

    if (stepExecutionIds.length === 0) {
      break;
    }

    const steps = await getStepExecutionsByWorkflowExecution({
      stepExecutionsDataClient,
      // Pure mget across the frontier: there is no single execution to scope to.
      workflowExecutionId: '',
      stepExecutionIds,
      sourceExcludes: ['input', 'output'] as (keyof EsWorkflowStepExecution)[],
    });

    frontier = steps
      .filter((step) => step.hasChildExecution)
      .map((step) => step.id)
      .filter((executionId) => !familyIds.includes(executionId));
    familyIds.push(...frontier);
  }

  return familyIds;
};
