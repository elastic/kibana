/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { JsonValue } from '@kbn/utility-types';
import {
  type EsWorkflowStepExecution,
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

type MarkStepAsRespondedCurrent = Pick<
  EsWorkflowStepExecution,
  (typeof MARK_STEP_AS_RESPONDED_SOURCE_FIELDS)[number]
>;

const stripHitlTokenFieldsFromInput = (input: JsonValue | undefined): JsonValue | undefined => {
  if (input == null || typeof input !== 'object' || Array.isArray(input)) {
    return input;
  }

  const record = { ...(input as Record<string, unknown>) };
  delete record[HITL_TOKEN_HASH_INPUT_FIELD];
  delete record[HITL_TOKEN_EXPIRES_AT_INPUT_FIELD];
  return record as JsonValue;
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
