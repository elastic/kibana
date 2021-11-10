/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { errors as EsErrors } from '@elastic/elasticsearch';
import * as Option from 'fp-ts/lib/Option';
import { Logger, LogMeta } from '../../logging';
import type { ElasticsearchClient } from '../../elasticsearch';
import { getErrorMessage, getRequestDebugMeta } from '../../elasticsearch';
import { Model, Next, stateActionMachine } from './state_action_machine';
import { cleanup } from './migrations_state_machine_cleanup';
import { ReindexSourceToTempTransform, ReindexSourceToTempIndexBulk, State } from './state';
import { SavedObjectsRawDoc } from '../serialization';

interface StateTransitionLogMeta extends LogMeta {
  kibana: {
    migrations: {
      state: State;
      duration: number;
    };
  };
}

const logStateTransition = (
  logger: Logger,
  logMessagePrefix: string,
  prevState: State,
  currState: State,
  tookMs: number
) => {
  if (currState.logs.length > prevState.logs.length) {
    currState.logs.slice(prevState.logs.length).forEach(({ message, level }) => {
      switch (level) {
        case 'error':
          return logger.error(logMessagePrefix + message);
        case 'warning':
          return logger.warn(logMessagePrefix + message);
        case 'info':
          return logger.info(logMessagePrefix + message);
        default:
          throw new Error(`unexpected log level ${level}`);
      }
    });
  }

  logger.info(
    logMessagePrefix + `${prevState.controlState} -> ${currState.controlState}. took: ${tookMs}ms.`
  );
  logger.debug<StateTransitionLogMeta>(
    logMessagePrefix + `${prevState.controlState} -> ${currState.controlState}. took: ${tookMs}ms.`,
    {
      kibana: {
        migrations: {
          state: currState,
          duration: tookMs,
        },
      },
    }
  );
};

const logActionResponse = (
  logger: Logger,
  logMessagePrefix: string,
  state: State,
  res: unknown
) => {
  logger.debug(logMessagePrefix + `${state.controlState} RESPONSE`, res as LogMeta);
};

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
  logger,
  next,
  model,
  client,
}: {
  initialState: State;
  logger: Logger;
  next: Next<State>;
  model: Model<State>;
  client: ElasticsearchClient;
}) {
  const startTime = Date.now();
  // Since saved object index names usually start with a `.` and can be
  // configured by users to include several `.`'s we can't use a logger tag to
  // indicate which messages come from which index upgrade.
  const logMessagePrefix = `[${initialState.indexPrefix}] `;
  let prevTimestamp = startTime;
  let lastState: State | undefined;
  try {
    const finalState = await stateActionMachine<State>(
      initialState,
      (state) => next(state),
      (state, res) => {
        lastState = state;
        logActionResponse(logger, logMessagePrefix, state, res);
        const newState = model(state, res);
        // Redact the state to reduce the memory consumption and so that we
        // don't log sensitive information inside documents by only keeping
        // the _id's of documents
        const redactedNewState = {
          ...newState,
          ...{
            outdatedDocuments: (
              (newState as ReindexSourceToTempTransform).outdatedDocuments ?? []
            ).map(
              (doc) =>
                ({
                  _id: doc._id,
                } as SavedObjectsRawDoc)
            ),
          },
          ...{
            transformedDocBatches: (
              (newState as ReindexSourceToTempIndexBulk).transformedDocBatches ?? []
            ).map((batches) => batches.map((doc) => ({ _id: doc._id }))) as [SavedObjectsRawDoc[]],
          },
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
      if (finalState.sourceIndex != null && Option.isSome(finalState.sourceIndex)) {
        return {
          status: 'migrated' as const,
          destIndex: finalState.targetIndex,
          sourceIndex: finalState.sourceIndex.value,
          elapsedMs,
        };
      } else {
        return {
          status: 'patched' as const,
          destIndex: finalState.targetIndex,
          elapsedMs,
        };
      }
    } else if (finalState.controlState === 'FATAL') {
      try {
        await cleanup(client, finalState);
      } catch (e) {
        logger.warn('Failed to cleanup after migrations:', e.message);
      }
      return Promise.reject(
        new Error(
          `Unable to complete saved object migrations for the [${initialState.indexPrefix}] index: ` +
            finalState.reason
        )
      );
    } else {
      throw new Error('Invalid terminating control state');
    }
  } catch (e) {
    try {
      await cleanup(client, lastState);
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
        `Unable to complete saved object migrations for the [${initialState.indexPrefix}] index. Please check the health of your Elasticsearch cluster and try again. ${failedRequestMessage}`
      );
    } else {
      logger.error(e);

      const newError = new Error(
        `Unable to complete saved object migrations for the [${initialState.indexPrefix}] index. ${e}`
      );

      // restore error stack to point to a source of the problem.
      newError.stack = `[${e.stack}]`;
      throw newError;
    }
  }
}
