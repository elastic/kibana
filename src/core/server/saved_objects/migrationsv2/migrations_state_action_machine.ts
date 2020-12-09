/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import * as Option from 'fp-ts/lib/Option';
import { Logger, LogMeta } from '../../logging';
import { Model, Next, stateActionMachine } from './state_action_machine';
import { State } from './types';

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
  // Since saved object index names usually start with a `.` and can be
  // configured by users to include several `.`'s we can't use a logger tag to
  // indicate which messages come from which index upgrade.
  const indexLogMsgPrefix = `[${initialState.indexPrefix}] `;
  const logStateTransition = (oldState: State, newState: State) => {
    if (newState.logs.length > oldState.logs.length) {
      newState.logs
        .slice(oldState.logs.length)
        .forEach((log) => logger[log.level](indexLogMsgPrefix + log.message));
    }

    // Redact the state for logging by removing logs and documents which
    // might contain sensitive information.
    // @ts-expect-error outdatedDocuments don't exist in all states
    const { logs, outdatedDocuments, ...redactedState } = newState;
    logger.info(indexLogMsgPrefix + `${oldState.controlState} -> ${newState.controlState}`);
    logger.debug(
      indexLogMsgPrefix + `${oldState.controlState} -> ${newState.controlState}`,
      redactedState
    );
  };

  const logActionResponse = (state: State, res: unknown) => {
    logger.debug(indexLogMsgPrefix + `${state.controlState} RESPONSE`, res as LogMeta);
  };

  try {
    const finalState = await stateActionMachine<State>(
      initialState,
      (state) => next(state),
      (state, res) => {
        logActionResponse(state, res);
        const newState = model(state, res);
        logStateTransition(state, newState);
        return newState;
      }
    );

    if (finalState.controlState === 'DONE') {
      if (finalState.sourceIndex != null && Option.isSome(finalState.sourceIndex)) {
        return {
          status: 'migrated' as const,
          destIndex: finalState.targetIndex,
          sourceIndex: finalState.sourceIndex.value,
          elapsedMs: 0,
        };
      } else {
        return {
          status: 'patched' as const,
          destIndex: finalState.targetIndex,
          elapsedMs: 0,
        };
      }
    } else if (finalState.controlState === 'FATAL') {
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
    logger.error(e);
    throw new Error(
      `Unable to complete saved object migrations for the [${initialState.indexPrefix}] index. Please check the health of your Elasticsearch cluster`
    );
  }
}
