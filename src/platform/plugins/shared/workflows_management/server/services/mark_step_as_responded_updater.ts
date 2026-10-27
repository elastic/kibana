/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { JsonObject, JsonValue } from '@kbn/utility-types';
import {
  type EsWorkflowStepExecution,
  ExecutionStatus,
  HITL_TOKEN_EXPIRES_AT_INPUT_FIELD,
  HITL_TOKEN_HASH_INPUT_FIELD,
  TerminalExecutionStatuses,
} from '@kbn/workflows';

const SETTLED_STEP_STATUSES: readonly string[] = TerminalExecutionStatuses;

export const MARK_STEP_AS_RESPONDED_SOURCE_FIELDS = [
  'spaceId',
  'finishedAt',
  'status',
  'hitl',
  'input',
] as const satisfies ReadonlyArray<keyof EsWorkflowStepExecution & string>;

export interface MarkStepAsRespondedAudit {
  respondedBy: string;
  respondedAt: string;
  channel?: string;
}

/** A claim won by `markStepAsResponded`, kept so a resume that was not applied can release it. */
export interface HitlStepClaim extends MarkStepAsRespondedAudit {
  /** External-resume token that the claim removed from the step `input`. */
  strippedToken?: { hash: string; expiresAt: string };
}

export type MarkStepAsRespondedCurrent = Pick<
  EsWorkflowStepExecution,
  (typeof MARK_STEP_AS_RESPONDED_SOURCE_FIELDS)[number]
>;

const stripHitlTokenFieldsFromInput = (input: JsonValue | undefined): JsonValue | undefined => {
  if (input == null || typeof input !== 'object' || Array.isArray(input)) {
    return input;
  }

  // ES `_update` `doc` merges nested objects: omitted keys stay. `null` removes the field
  // (same as Painless `ctx._source.input.remove(...)`).
  return {
    ...(input as Record<string, unknown>),
    [HITL_TOKEN_HASH_INPUT_FIELD]: null,
    [HITL_TOKEN_EXPIRES_AT_INPUT_FIELD]: null,
  } as JsonValue;
};

export const createMarkStepAsRespondedUpdater = (
  audit: MarkStepAsRespondedAudit,
  spaceId: string
): ((current: MarkStepAsRespondedCurrent) => Partial<EsWorkflowStepExecution> | 'noop') => {
  return (current) => {
    if (current.spaceId !== spaceId) {
      return 'noop';
    }
    if (current.finishedAt != null) {
      return 'noop';
    }
    if (current.status != null && SETTLED_STEP_STATUSES.includes(current.status)) {
      return 'noop';
    }
    if (current.hitl?.respondedAt != null) {
      return 'noop';
    }

    const hitl: NonNullable<EsWorkflowStepExecution['hitl']> = {
      ...(current.hitl ?? {}),
      respondedBy: audit.respondedBy,
      respondedAt: audit.respondedAt,
      ...(audit.channel != null ? { channel: audit.channel } : {}),
    };

    const input = stripHitlTokenFieldsFromInput(current.input);
    const patch: Partial<EsWorkflowStepExecution> = { hitl };
    if (input !== current.input) {
      patch.input = input;
    }

    return patch;
  };
};

const isJsonObject = (value: JsonValue | undefined): value is JsonObject =>
  value != null && typeof value === 'object' && !Array.isArray(value);

/** Returns the external-resume token held in a step `input`, which claiming that step strips. */
export const getStrippedHitlToken = (
  current: Pick<EsWorkflowStepExecution, 'input'>
): HitlStepClaim['strippedToken'] => {
  const { input } = current;
  if (!isJsonObject(input)) {
    return undefined;
  }
  const hash = input[HITL_TOKEN_HASH_INPUT_FIELD];
  const expiresAt = input[HITL_TOKEN_EXPIRES_AT_INPUT_FIELD];
  if (typeof hash !== 'string' || typeof expiresAt !== 'string') {
    return undefined;
  }
  return { hash, expiresAt };
};

/** Creates an updater that undoes `claim` only while the step still waits for input under it. */
export const createReleaseHitlStepClaimUpdater = (
  claim: HitlStepClaim,
  spaceId: string
): ((current: MarkStepAsRespondedCurrent) => Partial<EsWorkflowStepExecution> | 'noop') => {
  return (current) => {
    if (current.spaceId !== spaceId) {
      return 'noop';
    }
    if (current.finishedAt != null) {
      return 'noop';
    }
    if (current.status !== ExecutionStatus.WAITING_FOR_INPUT) {
      return 'noop';
    }
    if (
      current.hitl?.respondedAt !== claim.respondedAt ||
      current.hitl?.respondedBy !== claim.respondedBy
    ) {
      return 'noop';
    }

    // `null` drops the whole object (a `doc` merge keeps every sub-key the patch leaves out), which
    // also puts the step back in the pending list.
    const patch: Partial<EsWorkflowStepExecution> = { hitl: null };
    const { strippedToken } = claim;
    const { input } = current;
    if (
      strippedToken &&
      isJsonObject(input) &&
      input[HITL_TOKEN_HASH_INPUT_FIELD] == null &&
      input[HITL_TOKEN_EXPIRES_AT_INPUT_FIELD] == null
    ) {
      patch.input = {
        ...input,
        [HITL_TOKEN_HASH_INPUT_FIELD]: strippedToken.hash,
        [HITL_TOKEN_EXPIRES_AT_INPUT_FIELD]: strippedToken.expiresAt,
      };
    }

    return patch;
  };
};
