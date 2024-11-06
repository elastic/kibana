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
import type { SavedObjectsRawDoc } from '@kbn/core-saved-objects-server';
import { logStateTransition, logActionResponse } from '../common/utils';
import { type Next, stateActionMachine } from '../state_action_machine';
import { cleanup } from '../migrations_state_machine_cleanup';
import type {
  State,
  OutdatedDocumentsSearchTransformState,
  OutdatedDocumentsSearchBulkIndexState,
} from './state';
import type { MigratorContext } from './context';
import { redactBulkOperationBatches } from '../common/redact_state';

/**
 * A specialized migrations-specific state-action machine that:
 *  - logs messages in state.logs
 *  - logs state transitions
 *  - logs action responses
 *  - resolves if the final state is DONE
 *  - rejects if the final state is FATAL
 *  - catches and logs exceptions and then rejects with a migrations specific error
 */
export async function migrationStateActionMachine({
  initialState,
  context,
  next,
  model,
  logger,
}: {
  initialState: State;
  context: MigratorContext;
  next: Next<State>;
  model: (state: State, res: any, context: MigratorContext) => State;
  logger: Logger;
}) {
  const startTime = Date.now();
  // Since saved object index names usually start with a `.` and can be
  // configured by users to include several `.`'s we can't use a logger tag to
  // indicate which messages come from which index upgrade.
  const logMessagePrefix = `[${context.indexPrefix}] `;
  let prevTimestamp = startTime;
  let lastState: State | undefined;
  try {
    const finalState = await stateActionMachine<State>(
      initialState,
      (state) => next(state),
      (state, res) => {
        lastState = state;
        logActionResponse(logger, logMessagePrefix, state, res);
        const newState = model(state, res, context);
        // Redact the state to reduce the memory consumption and so that we
        // don't log sensitive information inside documents by only keeping
        // the _id's of documents
        const redactedNewState = {
          ...newState,
          outdatedDocuments: (
            (newState as OutdatedDocumentsSearchTransformState).outdatedDocuments ?? []
          ).map((doc) => ({ _id: doc._id } as SavedObjectsRawDoc)),
          bulkOperationBatches: redactBulkOperationBatches(
            (newState as OutdatedDocumentsSearchBulkIndexState).bulkOperationBatches ?? [[]]
          ),
        };

        const now = Date.now();
        logStateTransition(
          logger,
          logMessagePrefix,
          state,
          redactedNewState as State,
          now - prevTimestamp
        );
        prevTimestamp = now;
        return newState;
      }
    );

    const elapsedMs = Date.now() - startTime;
    if (finalState.controlState === 'DONE') {
      logger.info(logMessagePrefix + `Migration completed after ${Math.round(elapsedMs)}ms`);
      return {
        status: 'patched' as const,
        destIndex: context.indexPrefix,
        elapsedMs,
      };
    } else if (finalState.controlState === 'FATAL') {
      try {
        await cleanup(context.elasticsearchClient, finalState);
      } catch (e) {
        logger.warn('Failed to cleanup after migrations:', e.message);
      }
      return Promise.reject(
        new Error(
          `Unable to complete saved object migrations for the [${context.indexPrefix}] index: ` +
            finalState.reason
        )
      );
    } else {
      throw new Error('Invalid terminating control state');
    }
  } catch (e) {
    try {
      await cleanup(context.elasticsearchClient, lastState);
    } catch (err) {
      logger.warn('Failed to cleanup after migrations:', err.message);
    }
    if (e instanceof EsErrors.ResponseError) {
      // Log the failed request. This is very similar to the
      // elasticsearch-service's debug logs, but we log everything in single
      // line until we have sub-ms resolution in our cloud logs. Because this
      // is error level logs, we're also more careful and don't log the request
      // body since this can very likely have sensitive saved objects.
      const req = getRequestDebugMeta(e.meta);
      const failedRequestMessage = `Unexpected Elasticsearch ResponseError: statusCode: ${
        req.statusCode
      }, method: ${req.method}, url: ${req.url} error: ${getErrorMessage(e)},`;
      logger.error(logMessagePrefix + failedRequestMessage);
      throw new Error(
        `Unable to complete saved object migrations for the [${context.indexPrefix}] index. Please check the health of your Elasticsearch cluster and try again. ${failedRequestMessage}`
      );
    } else {
      logger.error(e);

      const newError = new Error(
        `Unable to complete saved object migrations for the [${context.indexPrefix}] index. ${e}`
      );

      // restore error stack to point to a source of the problem.
      newError.stack = `[${e.stack}]`;
      throw newError;
    }
  }
}
