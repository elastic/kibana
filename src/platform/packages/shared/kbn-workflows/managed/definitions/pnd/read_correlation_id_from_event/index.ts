/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * The Attack Discovery created-trigger field. Floor YAML maps it onto `correlationId` at every
 * PND route call; persisted `context.event` still carries this producer name.
 */
const PRODUCER_ALERT_ID_FIELD = 'attackDiscoveryAlertId' as const;
const ATTACK_DISCOVERY_EVIDENCE_KIND = 'attack_discovery' as const;

const readNonemptyString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value != null && typeof value === 'object' && !Array.isArray(value);

/**
 * First `{ kind: 'attack_discovery', id }` on a detection-change claim. Dark Watch evidence is
 * hunt findings with no Attack Discovery, so a missing or unusable ref is `''` — the same
 * degrade Post-Incident's `set_correlation_id` already documents.
 */
const readAttackDiscoveryIdFromEvidenceRefs = (value: unknown): string => {
  if (!Array.isArray(value)) {
    return '';
  }

  const match = value.find((ref) => {
    if (!isRecord(ref) || ref.kind !== ATTACK_DISCOVERY_EVIDENCE_KIND) {
      return false;
    }

    return readNonemptyString(ref.id) !== '';
  });

  return isRecord(match) ? readNonemptyString(match.id) : '';
};

/**
 * PND's correlation id on a trigger event: prefer the mapped `correlationId`, then the producer
 * alert id the Floor still stores on `context.event`, then the first `attack_discovery`
 * evidence ref on a `security.detectionChangeSignal` (Post-Incident has no top-level id).
 */
export const readCorrelationIdFromEvent = (event: Record<string, unknown> | undefined): string => {
  if (event == null) {
    return '';
  }

  const mapped = readNonemptyString(event.correlationId);
  if (mapped !== '') {
    return mapped;
  }

  const producer = readNonemptyString(event[PRODUCER_ALERT_ID_FIELD]);
  if (producer !== '') {
    return producer;
  }

  return readAttackDiscoveryIdFromEvidenceRefs(event.evidenceRefs);
};

/** Same mapping, from a persisted execution `context` whose `event` is the trigger payload. */
export const readCorrelationIdFromExecutionContext = (
  context: Record<string, unknown> | undefined
): string => {
  const event = context?.event;
  if (event == null || typeof event !== 'object' || Array.isArray(event)) {
    return '';
  }

  return readCorrelationIdFromEvent(event as Record<string, unknown>);
};
