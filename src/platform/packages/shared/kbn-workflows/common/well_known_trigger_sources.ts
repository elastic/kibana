/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Values persisted on workflow execution `triggeredBy` for built-in trigger paths.
 * 'workflow-step' is used for sub-workflows.
 * Event-driven runs use a registered trigger id (e.g. `cases.caseCreated`) plus
 * event payload / dispatch metadata from the trigger-event handler. Custom
 * `triggeredBy` provenance strings (product orchestrators) are not event-driven.
 */
export type WellKnownWorkflowTriggerSource = 'manual' | 'scheduled' | 'alert' | 'workflow-step';

const WELL_KNOWN_SET: ReadonlySet<string> = new Set<WellKnownWorkflowTriggerSource>([
  'manual',
  'scheduled',
  'alert',
  'workflow-step',
]);

/**
 * Execution fields used to classify event-driven runs. Callers may pass a full
 * execution document or a subset (`triggeredBy` + `context`).
 */
export interface EventDrivenWorkflowTriggerSourceInput {
  triggeredBy?: string;
  dispatchEventId?: string;
  metadata?: Record<string, unknown>;
  context?: Record<string, unknown> | null;
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  value != null && typeof value === 'object' && !Array.isArray(value);

const pickNonEmptyString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

/**
 * Resolves event-dispatch evidence from an execution document.
 * Prefers top-level `metadata` / `dispatchEventId`, then `context.metadata`.
 */
export const getEventDrivenWorkflowTriggerEvidence = (
  execution: EventDrivenWorkflowTriggerSourceInput
): {
  triggeredBy?: string;
  event: unknown;
  eventTriggerId?: string;
  eventId?: string;
} => {
  const top = isPlainObject(execution.metadata) ? execution.metadata : undefined;
  const nestedRaw = execution.context?.metadata;
  const nested = isPlainObject(nestedRaw) ? nestedRaw : undefined;

  return {
    triggeredBy: execution.triggeredBy,
    event: execution.context?.event,
    eventTriggerId:
      pickNonEmptyString(top?.eventTriggerId) ?? pickNonEmptyString(nested?.eventTriggerId),
    eventId:
      pickNonEmptyString(execution.dispatchEventId) ??
      pickNonEmptyString(top?.eventId) ??
      pickNonEmptyString(nested?.eventId),
  };
};

const hasEventDrivenDispatchEvidence = (
  evidence: ReturnType<typeof getEventDrivenWorkflowTriggerEvidence>
): boolean => evidence.eventTriggerId != null || evidence.eventId != null || evidence.event != null;

/**
 * Returns true when `triggeredBy` is one of the platform-defined execution sources.
 * Used to distinguish built-in triggers from event-driven trigger ids in telemetry and APM.
 */
export const isWellKnownWorkflowTriggerSource = (
  triggeredBy: string | undefined
): triggeredBy is WellKnownWorkflowTriggerSource =>
  typeof triggeredBy === 'string' && triggeredBy.length > 0 && WELL_KNOWN_SET.has(triggeredBy);

/**
 * Returns true only for true event-driven executions (trigger-event handler path).
 * A non-well-known `triggeredBy` string is not sufficient; event payload and/or
 * dispatch metadata (`eventTriggerId` / `eventId`) must also be present.
 */
export const isEventDrivenWorkflowTriggerSource = (
  execution: EventDrivenWorkflowTriggerSourceInput
): boolean => {
  const evidence = getEventDrivenWorkflowTriggerEvidence(execution);
  const { triggeredBy } = evidence;
  if (
    typeof triggeredBy !== 'string' ||
    triggeredBy.length === 0 ||
    isWellKnownWorkflowTriggerSource(triggeredBy)
  ) {
    return false;
  }
  return hasEventDrivenDispatchEvidence(evidence);
};
