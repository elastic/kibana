/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
import { evaluateKql } from '@kbn/eval-kql';
import type { WorkflowDetailDto } from '@kbn/workflows';

/**
 * Determines if a workflow's trigger condition matches the given event payload.
 *
 * @param workflow - The workflow details, including its definition.
 * @param triggerId - The ID of the trigger being evaluated.
 * @param payload - The event payload (e.g. from emitEvent).
 * @param logger - Optional logger for evaluation errors.
 * @returns true if the workflow should run for this event, false otherwise.
 */
export function workflowMatchesTriggerCondition(
  workflow: WorkflowDetailDto,
  triggerId: string,
  payload: Record<string, unknown>,
  logger?: Logger
): boolean {
  const triggers = workflow.definition?.triggers;
  if (!triggers || triggers.length === 0) {
    return false;
  }

  const matchingTrigger = triggers.find((t) => t && t.type === triggerId);
  if (!matchingTrigger) {
    return false;
  }

  const withBlock = matchingTrigger && 'with' in matchingTrigger ? matchingTrigger.with : undefined;
  const condition =
    withBlock && typeof withBlock === 'object' && withBlock !== null && 'condition' in withBlock
      ? withBlock.condition
      : undefined;
  const conditionStr = typeof condition === 'string' ? condition.trim() : '';

  if (conditionStr === '') {
    return true;
  }

  try {
    return evaluateKql(conditionStr, { event: payload });
  } catch (error) {
    logger?.warn(
      `Error evaluating KQL condition for workflow ${
        workflow.id
      }, trigger ${triggerId}: ${conditionStr}. Error: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return false;
  }
}
