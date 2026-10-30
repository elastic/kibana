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
import { ALL_CONNECTOR_IDS, type CustomTrigger, type WorkflowDetailDto } from '@kbn/workflows';

/**
 * Why a subscribed workflow did or did not match an emitted trigger event (for funnel telemetry).
 */
export type WorkflowTriggerMatchOutcome =
  | 'matched'
  | 'disabled'
  | 'kql_false'
  | 'kql_error'
  | 'connector_id_mismatch';

export interface ClassifyWorkflowTriggerMatchOptions {
  /** When true, YAML `connector-id` must equal payload `connectorId` or `*` before KQL. */
  requiresConnectorId?: boolean;
}

const readTrimmedString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const isCustomTrigger = (trigger: unknown): trigger is CustomTrigger =>
  trigger != null &&
  typeof trigger === 'object' &&
  'type' in trigger &&
  typeof trigger.type === 'string';

const getYamlConnectorId = (trigger: CustomTrigger): string =>
  readTrimmedString(trigger['connector-id']);

/**
 * Picks the YAML trigger block to evaluate for this emit.
 * When `requiresConnectorId`, scans every same-type block and returns an exact
 * `connector-id` match before falling back to `*`. If more than one `*` block
 * exists for this type, the first in YAML order wins. Otherwise the first block
 * of that type.
 */
export const findMatchingWorkflowTrigger = (
  triggers: readonly unknown[] | undefined,
  triggerId: string,
  payload: Record<string, unknown>,
  requiresConnectorId?: boolean
): CustomTrigger | undefined => {
  const ofType = (triggers ?? []).filter(
    (trigger): trigger is CustomTrigger => isCustomTrigger(trigger) && trigger.type === triggerId
  );
  if (ofType.length === 0) {
    return undefined;
  }
  if (!requiresConnectorId) {
    return ofType[0];
  }
  const eventConnectorId = readTrimmedString(payload.connectorId);
  if (eventConnectorId === '') {
    return undefined;
  }
  return (
    ofType.find((trigger) => getYamlConnectorId(trigger) === eventConnectorId) ??
    ofType.find((trigger) => getYamlConnectorId(trigger) === ALL_CONNECTOR_IDS)
  );
};

/**
 * Classifies a workflow for a given trigger id and event payload
 * (enabled gate, connector-id gate, trigger block, KQL).
 */
export function classifyWorkflowTriggerMatch(
  workflow: WorkflowDetailDto,
  triggerId: string,
  payload: Record<string, unknown>,
  logger?: Logger,
  options?: ClassifyWorkflowTriggerMatchOptions
): WorkflowTriggerMatchOutcome {
  if (!workflow.enabled) {
    return 'disabled';
  }

  const triggers = workflow.definition?.triggers;
  if (!triggers || triggers.length === 0) {
    return 'kql_false';
  }

  const requiresConnectorId = options?.requiresConnectorId === true;
  const matchingTrigger = findMatchingWorkflowTrigger(
    triggers,
    triggerId,
    payload,
    requiresConnectorId
  );
  if (!matchingTrigger) {
    const hasType = triggers.some(
      (trigger) => isCustomTrigger(trigger) && trigger.type === triggerId
    );
    return requiresConnectorId && hasType ? 'connector_id_mismatch' : 'kql_false';
  }

  const onBlock = matchingTrigger.on;
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
  logger?: Logger,
  options?: ClassifyWorkflowTriggerMatchOptions
): boolean {
  return classifyWorkflowTriggerMatch(workflow, triggerId, payload, logger, options) === 'matched';
}
