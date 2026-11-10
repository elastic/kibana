/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreStart, KibanaRequest } from '@kbn/core/server';
import type { EsWorkflowExecution } from '@kbn/workflows';
import { UNKNOWN_EXECUTION_IDENTITY } from './lib/execution_identity';
import { getAuthenticatedUser } from './lib/get_user';
import { ResumeAsIdentityLookupError } from './resume_as_identity_lookup_error';

/** Execution context key of the HITL wait whose answer continues the execution as its responder. */
export const RESUME_AS_CONTEXT_KEY = 'resumeAs';

export const RESUME_AS_RESPONDER_ERROR = 'ResumeAsResponderError';

/**
 * ES merges partial context updates, so every write of this record carries both keys; a record
 * written without `responder` would keep the one of an earlier wait.
 */
export interface ResumeAsRecord {
  /** The waiting step execution that set `resume-as: responder`. */
  stepExecutionId: string;
  /** Who the execution runs as since that step applied their answer, `null` until then. */
  responder: string | null;
}

/** Thrown when an execution runs as a responder whose credentials the current run does not hold. */
export class ResumeAsResponderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = RESUME_AS_RESPONDER_ERROR;
  }
}

const responderRequests = new WeakMap<KibanaRequest, string>();

const isResumeAsRecord = (value: unknown): value is ResumeAsRecord =>
  value != null &&
  typeof value === 'object' &&
  'stepExecutionId' in value &&
  typeof value.stepExecutionId === 'string' &&
  'responder' in value &&
  (value.responder === null || typeof value.responder === 'string');

export const getResumeAsRecord = (
  context: EsWorkflowExecution['context'] | null | undefined
): ResumeAsRecord | undefined => {
  const record: unknown = context?.[RESUME_AS_CONTEXT_KEY];
  return isResumeAsRecord(record) ? record : undefined;
};

const getPendingResponder = (
  context: EsWorkflowExecution['context'] | null | undefined
): string | undefined => {
  const { pendingInteractiveResume, resumeInput, resumedBy } = context ?? {};
  return pendingInteractiveResume === true &&
    resumeInput != null &&
    typeof resumedBy === 'string' &&
    resumedBy !== UNKNOWN_EXECUTION_IDENTITY
    ? resumedBy
    : undefined;
};

/**
 * The responder a resume run of `execution` acts as instead of its service account: the person who
 * answered a `resume-as: responder` wait, or the one the execution runs as since. Only returned when
 * the run's own identity is that person. Throws `ResumeAsResponderError` when the execution runs as
 * a responder and this run is someone else, and `ResumeAsIdentityLookupError` when this run's
 * identity cannot be resolved.
 */
export const resolveWorkflowResponder = async (
  core: CoreStart,
  execution: Pick<EsWorkflowExecution, 'context'>,
  request: KibanaRequest
): Promise<string | undefined> => {
  const record = getResumeAsRecord(execution.context);
  const responder = record && (record.responder ?? getPendingResponder(execution.context));
  if (!record || !responder) {
    return undefined;
  }
  const runIdentity = await getAuthenticatedUser(request, core.security, core.elasticsearch.client);
  if (!runIdentity) {
    throw new ResumeAsIdentityLookupError();
  }
  if (runIdentity.executedBy === responder) {
    return responder;
  }
  if (record.responder) {
    throw new ResumeAsResponderError(
      `This execution runs as ${responder} since their answer (resume-as: responder), but this run does not hold their credentials.`
    );
  }
  // The waiting step refuses an answer that this run cannot apply as its responder.
  return undefined;
};

/** The responder a run acts as, when `withWorkflowResponder` started it. */
export const getWorkflowResponder = (request: KibanaRequest): string | undefined =>
  responderRequests.get(request);

/** Runs `execute` with `request`, verified to belong to `responder`, acting as that person. */
export const withWorkflowResponder = async <T>(
  request: KibanaRequest,
  responder: string,
  execute: () => Promise<T>
): Promise<T> => {
  responderRequests.set(request, responder);
  try {
    return await execute();
  } finally {
    responderRequests.delete(request);
  }
};
