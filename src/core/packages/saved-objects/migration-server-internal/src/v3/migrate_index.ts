/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { errors as EsErrors } from '@elastic/elasticsearch';
import type { Logger } from '@kbn/logging';
import {
  getErrorMessage,
  getRequestDebugMeta,
} from '@kbn/core-elasticsearch-client-server-internal';
import type { MigrationResult } from '@kbn/core-saved-objects-base-server-internal';
import { logStateTransition, type LogAwareState } from '../common/utils';
import { redactBulkOperationBatches } from '../common/redact_state';
import type { MigrationContext } from './context';
import { assertInvariants, assertLegalTransition } from './invariants';
import type { IO } from './io';
import { next } from './next';
import { createInitialState, isTerminalState, type State, type TerminalState } from './state';

const delay = (ms: number): Promise<void> =>
  ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();

/** Removes the documents from the state, so that they are neither logged nor kept in memory by the logs. */
const redact = (state: State): LogAwareState => ({
  ...state,
  ...('outdatedDocuments' in state && {
    outdatedDocuments: state.outdatedDocuments.map(({ _id }) => ({ _id, _source: {} })),
  }),
  ...('bulkOperationBatches' in state && {
    bulkOperationBatches: redactBulkOperationBatches(state.bulkOperationBatches),
  }),
});

/** Closes the point-in-time left open by a failed migration, if any. */
const cleanup = async (io: IO, logger: Logger, state: State | undefined): Promise<void> => {
  if (state && 'pitId' in state && state.pitId) {
    const response = await io.closePit(state.pitId).catch((error: Error) => ({
      type: 'error' as const,
      message: error.message,
    }));
    if (response.type !== 'success') {
      logger.warn(`Failed to cleanup after migrations: ${JSON.stringify(response)}`);
    }
  }
};

const runStateMachine = async (
  context: MigrationContext,
  io: IO,
  logger: Logger,
  onState: (state: State) => void
): Promise<TerminalState> => {
  const logPrefix = `[${context.indexPrefix}] `;
  let state: State = createInitialState();
  let lastTransition = Date.now();
  onState(state);

  while (!isTerminalState(state)) {
    assertInvariants(state, context);
    await delay(state.retryDelay);
    const nextState = await next(state, io, context);
    assertLegalTransition(state, nextState);
    const now = Date.now();
    logStateTransition(logger, logPrefix, state, redact(nextState), now - lastTransition);
    lastTransition = now;
    state = nextState;
    onState(state);
  }

  assertInvariants(state, context);
  return state;
};

const toError = (context: MigrationContext, logger: Logger, error: Error): Error => {
  const logPrefix = `[${context.indexPrefix}] `;
  if (error instanceof EsErrors.ResponseError) {
    // the request body is not logged, it may contain sensitive saved objects
    const req = getRequestDebugMeta(error.meta);
    const failedRequestMessage = `Unexpected Elasticsearch ResponseError: statusCode: ${
      req.statusCode
    }, method: ${req.method}, url: ${req.url} error: ${getErrorMessage(error)},`;
    logger.error(logPrefix + failedRequestMessage);
    return new Error(
      `Unable to complete saved object migrations for the [${context.indexPrefix}] index. Please check the health of your Elasticsearch cluster and try again. ${failedRequestMessage}`
    );
  }
  logger.error(error);
  const wrapped = new Error(
    `Unable to complete saved object migrations for the [${context.indexPrefix}] index. ${error}`
  );
  wrapped.stack = `[${error.stack}]`;
  return wrapped;
};

/** Runs the v3 migration of the index of `context.indexPrefix`. */
export const migrateIndex = async ({
  context,
  io,
  logger,
}: {
  context: MigrationContext;
  io: IO;
  logger: Logger;
}): Promise<MigrationResult> => {
  const startTime = Date.now();
  let lastState: State | undefined;

  const finalState = await runStateMachine(context, io, logger, (state) => {
    lastState = state;
  }).catch(async (error: Error) => {
    await cleanup(io, logger, lastState);
    throw toError(context, logger, error);
  });

  const elapsedMs = Date.now() - startTime;
  if (finalState.controlState === 'FATAL') {
    await cleanup(io, logger, finalState);
    throw new Error(
      `Unable to complete saved object migrations for the [${context.indexPrefix}] index: ${finalState.reason}`
    );
  }

  logger.info(`[${context.indexPrefix}] Migration completed after ${Math.round(elapsedMs)}ms`);
  return {
    status: 'patched',
    destIndex: context.indexPrefix,
    elapsedMs,
  };
};
