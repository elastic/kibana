/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsWorkflowStepExecution } from '@kbn/workflows';
import type {
  GetStepExecutionsByIdsOptions,
  StepExecutionsDataClient,
  WorkflowExecutionsDataClient,
} from '@kbn/workflows-execution-engine/server';
import { getStepExecutionsByWorkflowExecution } from '@kbn/workflows-execution-engine/server';

/**
 * Guards against an unbounded walk if a wrapper step ever pointed at an
 * execution that loops back. Deeper than any nesting the editor allows.
 */
const MAX_DESCENDANT_DEPTH = 20;

interface MergeDescendantStepExecutionsParams {
  workflowExecutionsDataClient: WorkflowExecutionsDataClient;
  stepExecutionsDataClient: StepExecutionsDataClient;
  spaceId: string;
  /** Step executions of the execution being viewed. */
  stepExecutions: EsWorkflowStepExecution[];
  sourceExcludes?: GetStepExecutionsByIdsOptions['sourceExcludes'];
}

/**
 * Folds the steps of nested executions into one flat step list, so a run whose
 * work is spread across several executions reads as a single execution.
 *
 * A parallel step's branches each run as their own execution. The branch's
 * wrapper step in the parent is marked `hasChildExecution` and its id *is* the
 * child's execution id, so the whole tree is reachable by mget — no search, and
 * therefore no index-refresh lag while a run is in flight.
 *
 * Each child step's `scopeStack` is rebased onto its wrapper's, which is what
 * makes the merged list nest correctly: the child ran a slice of the graph and
 * so numbers its scopes from zero, with no knowledge of where it was spliced in.
 */
export const mergeDescendantStepExecutions = async ({
  workflowExecutionsDataClient,
  stepExecutionsDataClient,
  spaceId,
  stepExecutions,
  sourceExcludes,
}: MergeDescendantStepExecutionsParams): Promise<EsWorkflowStepExecution[]> => {
  const merged = [...stepExecutions];
  const visitedExecutionIds = new Set<string>();
  let frontier = stepExecutions.filter((step) => step.hasChildExecution);

  for (let depth = 0; frontier.length > 0 && depth < MAX_DESCENDANT_DEPTH; depth++) {
    const wrappersByExecutionId = new Map(
      frontier
        .filter((wrapper) => !visitedExecutionIds.has(wrapper.id))
        .map((wrapper) => [wrapper.id, wrapper])
    );
    if (wrappersByExecutionId.size === 0) {
      break;
    }
    for (const executionId of wrappersByExecutionId.keys()) {
      visitedExecutionIds.add(executionId);
    }

    const { items } = await workflowExecutionsDataClient.getByIds([
      ...wrappersByExecutionId.keys(),
    ]);
    const childStepExecutionIds = items
      .map(({ document }) => document)
      .filter((document) => document?.spaceId === spaceId)
      .flatMap((document) => document.stepExecutionIds ?? []);

    if (childStepExecutionIds.length === 0) {
      break;
    }

    const childSteps = await getStepExecutionsByWorkflowExecution({
      stepExecutionsDataClient,
      // Pure mget across several child executions: the ids are already known,
      // so there is no single execution to scope a search to.
      workflowExecutionId: '',
      stepExecutionIds: childStepExecutionIds,
      sourceExcludes,
    });

    const rebased: EsWorkflowStepExecution[] = [];
    for (const childStep of childSteps) {
      const wrapper = wrappersByExecutionId.get(childStep.workflowRunId);
      if (!wrapper) {
        continue;
      }
      rebased.push({
        ...childStep,
        scopeStack: [...wrapper.scopeStack, ...childStep.scopeStack],
      });
    }

    merged.push(...rebased);
    frontier = rebased.filter((step) => step.hasChildExecution);
  }

  return merged;
};
