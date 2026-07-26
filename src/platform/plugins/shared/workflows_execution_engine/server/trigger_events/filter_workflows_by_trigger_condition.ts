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
 * Why a subscribed workflow did or did not match an emitted trigger event (for funnel telemetry).
 */
export type WorkflowTriggerMatchOutcome = 'matched' | 'disabled' | 'kql_false' | 'kql_error';

/**
 * Classifies a workflow for a given trigger id and event payload (enabled gate, trigger block, KQL).
 */
export function classifyWorkflowTriggerMatch(
  workflow: WorkflowDetailDto,
  triggerId: string,
  payload: Record<string, unknown>,
  logger?: Logger
): WorkflowTriggerMatchOutcome {
  if (!workflow.enabled) {
    return 'disabled';
  }

  const triggers = workflow.definition?.triggers;
  if (!triggers || triggers.length === 0) {
    return 'kql_false';
  }

  const matchingTrigger = triggers.find((t) => t && t.type === triggerId);
  if (!matchingTrigger) {
    return 'kql_false';
  }

  const onBlock = matchingTrigger && 'on' in matchingTrigger ? matchingTrigger.on : undefined;
  const condition =
    onBlock && typeof onBlock === 'object' && onBlock !== null && 'condition' in onBlock
      ? onBlock.condition
      : undefined;
  const conditionStr = typeof condition === 'string' ? condition.trim() : '';

  if (conditionStr === '') {
    return 'matched';
  }

  try {
    return evaluateKql(conditionStr, { event: payload }) ? 'matched' : 'kql_false';
  } catch (error) {
    logger?.warn(
      `Error evaluating KQL condition for workflow ${
        workflow.id
      }, trigger ${triggerId}: ${conditionStr}. Error: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return 'kql_error';
  }
}

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
  return classifyWorkflowTriggerMatch(workflow, triggerId, payload, logger) === 'matched';
}
