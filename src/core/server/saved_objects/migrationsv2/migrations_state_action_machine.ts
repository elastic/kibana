/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { errors as EsErrors } from '@elastic/elasticsearch';
import * as Option from 'fp-ts/lib/Option';
import { performance } from 'perf_hooks';
import { Logger, LogMeta } from '../../logging';
import { Model, Next, stateActionMachine } from './state_action_machine';
import { State } from './types';

type ExecutionLog = Array<
  | {
      type: 'transition';
      prevControlState: State['controlState'];
      controlState: State['controlState'];
      state: State;
    }
  | {
      type: 'response';
      controlState: State['controlState'];
      res: unknown;
    }
>;

const logStateTransition = (
  logger: Logger,
  logMessagePrefix: string,
  oldState: State,
  newState: State
) => {
  if (newState.logs.length > oldState.logs.length) {
    newState.logs
      .slice(oldState.logs.length)
      .forEach((log) => logger[log.level](logMessagePrefix + log.message));
  }

  logger.info(logMessagePrefix + `${oldState.controlState} -> ${newState.controlState}`);
};

const logActionResponse = (
  logger: Logger,
  logMessagePrefix: string,
  state: State,
  res: unknown
) => {
  logger.debug(logMessagePrefix + `${state.controlState} RESPONSE`, res as LogMeta);
};

const dumpExecutionLog = (logger: Logger, logMessagePrefix: string, executionLog: ExecutionLog) => {
  logger.error(logMessagePrefix + 'migration failed, dumping execution log:');
  executionLog.forEach((log) => {
    if (log.type === 'transition') {
      logger.info(logMessagePrefix + `${log.prevControlState} -> ${log.controlState}`, log.state);
    }
    if (log.type === 'response') {
      logger.info(logMessagePrefix + `${log.controlState} RESPONSE`, log.res as LogMeta);
    }
  });
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
}: {
  initialState: State;
  logger: Logger;
  next: Next<State>;
  model: Model<State>;
}) {
  const executionLog: ExecutionLog = [];
  const starteTime = performance.now();
  // Since saved object index names usually start with a `.` and can be
  // configured by users to include several `.`'s we can't use a logger tag to
  // indicate which messages come from which index upgrade.
  const logMessagePrefix = `[${initialState.indexPrefix}] `;
  try {
    const finalState = await stateActionMachine<State>(
      initialState,
      (state) => next(state),
      (state, res) => {
        executionLog.push({
          type: 'response',
          res,
          controlState: state.controlState,
        });
        logActionResponse(logger, logMessagePrefix, state, res);
        const newState = model(state, res);
        // Redact the state to reduce the memory consumption and so that we
        // don't log sensitive information inside documents by only keeping
        // the _id's of outdatedDocuments
        const redactedNewState = {
          ...newState,
          // @ts-expect-error outdatedDocuments don't exist in all states
          ...{ outdatedDocuments: (newState.outdatedDocuments ?? []).map((doc) => doc._id) },
        };
        executionLog.push({
          type: 'transition',
          state: redactedNewState,
          controlState: newState.controlState,
          prevControlState: state.controlState,
        });
        logStateTransition(logger, logMessagePrefix, state, redactedNewState as State);
        return newState;
      }
    );

    const elapsedMs = performance.now() - starteTime;
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
      dumpExecutionLog(logger, logMessagePrefix, executionLog);
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
    if (e instanceof EsErrors.ResponseError) {
      logger.error(
        logMessagePrefix + `[${e.body?.error?.type}]: ${e.body?.error?.reason ?? e.message}`
      );
    } else {
      logger.error(e);
    }
    dumpExecutionLog(logger, logMessagePrefix, executionLog);
    throw new Error(
      `Unable to complete saved object migrations for the [${initialState.indexPrefix}] index. Please check the health of your Elasticsearch cluster and try again. ${e}`
    );
  }
}
