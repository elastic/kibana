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
  hasHitlExternalResumeToken,
  HITL_TOKEN_EXPIRES_AT_INPUT_FIELD,
  HITL_TOKEN_HASH_INPUT_FIELD,
  isHitlWaitStepType,
  readHitlExternalResumeToken,
  TerminalExecutionStatuses,
} from '@kbn/workflows';

const SETTLED_STEP_STATUSES: readonly string[] = TerminalExecutionStatuses;

export const MARK_STEP_AS_RESPONDED_SOURCE_FIELDS = [
  'spaceId',
  'workflowRunId',
  'stepType',
  'finishedAt',
  'status',
  'hitl',
  'input',
  'state',
] as const satisfies ReadonlyArray<keyof EsWorkflowStepExecution & string>;

export interface MarkStepAsRespondedAudit {
  respondedBy: string;
  respondedAt: string;
  channel?: string;
}

/** A claim won by `markStepAsResponded`, kept so a resume that was not applied can release it. */
export interface HitlStepClaim extends MarkStepAsRespondedAudit {
  /**
   * External-resume token the claim removed. Lives only for this request.
   * `state` is the current location. `input` is the copy a 9.6 node reads.
   * `mirroredOnInput` means both copies were live.
   */
  strippedToken?: {
    hash: string;
    expiresAt: string;
    source: 'state' | 'input';
    mirroredOnInput: boolean;
  };
}

export type MarkStepAsRespondedCurrent = Pick<
  EsWorkflowStepExecution,
  (typeof MARK_STEP_AS_RESPONDED_SOURCE_FIELDS)[number]
>;

const nullHitlTokenFields = {
  [HITL_TOKEN_HASH_INPUT_FIELD]: null,
  [HITL_TOKEN_EXPIRES_AT_INPUT_FIELD]: null,
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value != null && typeof value === 'object' && !Array.isArray(value);

/** ES `_update` `doc` merges nested objects: omitted keys stay. `null` removes the field. */
function stripHitlTokenFields(value: JsonValue | undefined): JsonValue | undefined;
function stripHitlTokenFields(
  value: Record<string, unknown> | undefined
): Record<string, unknown> | undefined;
function stripHitlTokenFields(value: unknown): JsonValue | Record<string, unknown> | undefined {
  if (!isRecord(value) || !hasHitlExternalResumeToken(value)) {
    return undefined;
  }
  return { ...value, ...nullHitlTokenFields };
}

export const createMarkStepAsRespondedUpdater = (
  audit: MarkStepAsRespondedAudit,
  spaceId: string,
  executionId: string
): ((current: MarkStepAsRespondedCurrent) => Partial<EsWorkflowStepExecution> | 'noop') => {
  return (current) => {
    if (current.spaceId !== spaceId) {
      return 'noop';
    }
    // The caller was authorised against `executionId` only, so a step of another run must not be claimed.
    if (current.workflowRunId !== executionId) {
      return 'noop';
    }
    // Container steps (foreach, if) stay `running` while a nested wait is paused and must not win the claim.
    if (!isHitlWaitStepType(current.stepType) && current.state?.breakpointPaused !== true) {
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

    const patch: Partial<EsWorkflowStepExecution> = { hitl };
    const input = stripHitlTokenFields(current.input);
    if (input) {
      patch.input = input;
    }
    const state = stripHitlTokenFields(current.state);
    if (state) {
      patch.state = state;
    }

    return patch;
  };
};

const isJsonObject = (value: JsonValue | undefined): value is JsonObject =>
  value != null && typeof value === 'object' && !Array.isArray(value);

/** Returns the external-resume token a claim removes. Step `state` wins when both copies are live. */
export const getStrippedHitlToken = (
  current: Pick<EsWorkflowStepExecution, 'input' | 'state'>
): HitlStepClaim['strippedToken'] => {
  const stateToken = readHitlExternalResumeToken({ state: current.state });
  const inputToken = readHitlExternalResumeToken({ input: current.input });
  if (stateToken) {
    return {
      ...stateToken,
      source: 'state',
      mirroredOnInput: inputToken != null,
    };
  }
  if (inputToken) {
    return { ...inputToken, source: 'input', mirroredOnInput: false };
  }
  return undefined;
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
    if (strippedToken?.source === 'state') {
      const state = current.state ?? {};
      if (
        state[HITL_TOKEN_HASH_INPUT_FIELD] == null &&
        state[HITL_TOKEN_EXPIRES_AT_INPUT_FIELD] == null
      ) {
        patch.state = {
          ...state,
          [HITL_TOKEN_HASH_INPUT_FIELD]: strippedToken.hash,
          [HITL_TOKEN_EXPIRES_AT_INPUT_FIELD]: strippedToken.expiresAt,
        };
      }
      const { input } = current;
      if (
        strippedToken.mirroredOnInput &&
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
    }

    const { input } = current;
    if (
      strippedToken?.source === 'input' &&
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
