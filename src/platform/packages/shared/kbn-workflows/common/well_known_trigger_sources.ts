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
 * Any other string is treated as an event-driven trigger id (e.g. `cases.caseCreated`).
 */
export type WellKnownWorkflowTriggerSource = 'manual' | 'scheduled' | 'alert' | 'workflow-step';

const WELL_KNOWN_SET: ReadonlySet<string> = new Set<WellKnownWorkflowTriggerSource>([
  'manual',
  'scheduled',
  'alert',
  'workflow-step',
]);

/**
 * Returns true when `triggeredBy` is one of the platform-defined execution sources.
 * Used to distinguish built-in triggers from event-driven trigger ids in telemetry and APM.
 */
export const isWellKnownWorkflowTriggerSource = (
  triggeredBy: string | undefined
): triggeredBy is WellKnownWorkflowTriggerSource =>
  typeof triggeredBy === 'string' && triggeredBy.length > 0 && WELL_KNOWN_SET.has(triggeredBy);

/**
 * Returns true when `triggeredBy` is a custom event trigger id (non-empty and not well-known).
 * This helper is the single source of truth for event-driven trigger-id classification.
 */
export const isEventDrivenWorkflowTriggerSource = (
  triggeredBy: string | undefined
): triggeredBy is string =>
  typeof triggeredBy === 'string' &&
  triggeredBy.length > 0 &&
  !isWellKnownWorkflowTriggerSource(triggeredBy);
