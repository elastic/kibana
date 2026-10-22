/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** Slack Block Kit `action_id` for waitForApproval Approve (keep in sync with connector-specs). */
export const HITL_SLACK_ACTION_APPROVE = 'workflows.hitl.approve' as const;

/** Slack Block Kit `action_id` for waitForApproval Decline. */
export const HITL_SLACK_ACTION_REJECT = 'workflows.hitl.reject' as const;

/** Slack Block Kit `action_id` for waitForInput submit. */
export const HITL_SLACK_ACTION_SUBMIT = 'workflows.hitl.submit' as const;

/** Inbound connector event id — resume only; not a workflow trigger. */
export const HITL_SLACK_ACTION_EVENT_ID = 'slack2.hitl_action' as const;

/** Slack button `value` / correlation codec version. */
export const HITL_SLACK_CORRELATION_VERSION = 1 as const;

export type HitlSlackInteractiveKind = 'approval' | 'input';

export interface HitlSlackCorrelation {
  readonly v: typeof HITL_SLACK_CORRELATION_VERSION;
  readonly executionId: string;
  readonly stepId: string;
  readonly token: string;
  readonly spaceId: string;
  readonly kind: HitlSlackInteractiveKind;
}

/** Slack interactive button `value` max length. */
export const HITL_SLACK_BUTTON_VALUE_MAX_LENGTH = 2000 as const;

export function encodeHitlSlackCorrelation(correlation: HitlSlackCorrelation): string {
  const encoded = JSON.stringify({
    v: correlation.v,
    e: correlation.executionId,
    s: correlation.stepId,
    t: correlation.token,
    p: correlation.spaceId,
    k: correlation.kind === 'approval' ? 'a' : 'i',
  });
  if (encoded.length > HITL_SLACK_BUTTON_VALUE_MAX_LENGTH) {
    throw new Error(
      `HITL Slack correlation exceeds ${HITL_SLACK_BUTTON_VALUE_MAX_LENGTH} characters`
    );
  }
  return encoded;
}

export function decodeHitlSlackCorrelation(value: string): HitlSlackCorrelation | undefined {
  if (value.length === 0 || value.length > HITL_SLACK_BUTTON_VALUE_MAX_LENGTH) {
    return undefined;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return undefined;
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return undefined;
  }

  const record = parsed as Record<string, unknown>;
  if (record.v !== HITL_SLACK_CORRELATION_VERSION) {
    return undefined;
  }

  const executionId = asNonEmptyString(record.e);
  const stepId = asNonEmptyString(record.s);
  const token = asNonEmptyString(record.t);
  const spaceId = asNonEmptyString(record.p);
  const kindCode = record.k;
  if (!executionId || !stepId || !token || !spaceId) {
    return undefined;
  }
  if (kindCode !== 'a' && kindCode !== 'i') {
    return undefined;
  }

  return {
    v: HITL_SLACK_CORRELATION_VERSION,
    executionId,
    stepId,
    token,
    spaceId,
    kind: kindCode === 'a' ? 'approval' : 'input',
  };
}

export function isHitlSlackActionId(actionId: string): boolean {
  return (
    actionId === HITL_SLACK_ACTION_APPROVE ||
    actionId === HITL_SLACK_ACTION_REJECT ||
    actionId === HITL_SLACK_ACTION_SUBMIT
  );
}

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}
