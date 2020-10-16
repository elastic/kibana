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

/* eslint-disable no-console */

import { ElasticsearchClient } from 'src/core/server/elasticsearch';
import { gt } from 'semver';
import chalk from 'chalk';
import { isLeft } from 'fp-ts/lib/Either';
import { TaskEither } from 'fp-ts/lib/TaskEither';
import * as Actions from './actions';
import { ActionResponse, AllResponses } from './actions';

export interface BaseState {
  kibanaVersion: string;
  retryCount: number;
  retryDelay: number;
  source: string;
  target: string;
  aliases: Record<string, string>;
  log: Array<{ level: 'error' | 'info'; message: string }>;
}

// Initial state
export type InitState = BaseState & {
  controlState: 'INIT';
};

export type DoneState = BaseState & {
  /** Migration completed successfully */
  controlState: 'DONE';
};

export type FatalState = BaseState & {
  /** Migration terminated with a failure */
  controlState: 'FATAL';
  error?: Error;
};

export type SetSourceWriteBlockState = BaseState & {
  /** Set a write block on the source index to prevent any further writes */
  controlState: 'SET_SOURCE_WRITE_BLOCK';
};

export type InitNewIndicesState = BaseState & {
  /** Blank ES cluster, create new kibana indices */
  controlState: 'INIT_NEW_INDICES';
};

export type CloneSourceState = BaseState & {
  /** Create the target index by cloning the source index */
  controlState: 'CLONE_SOURCE';
};

export type ReindexSourceToAlias = BaseState & {
  /** Reindex a concrete index   */
  controlState: 'REINDEX_SOURCE_TO_ALIAS';
};

export type State =
  | FatalState
  | InitState
  | DoneState
  | SetSourceWriteBlockState
  | InitNewIndicesState
  | CloneSourceState
  | ReindexSourceToAlias;

type Model = (currentState: State, result: ActionResponse) => State;
type NextAction = (
  client: ElasticsearchClient,
  state: State
) => TaskEither<Error, AllResponses> | null;

/**
 * A helper function/type for ensuring that all control state's are handled.
 */
function throwBadControlState(p: never): never;
function throwBadControlState(controlState: any) {
  throw new Error('Unknown control state: ' + controlState);
}

function indexVersion(indexName: string) {
  return (indexName.match(/\.kibana_(\d+\.\d+\.\d+)_\d+/) || [])[1];
}

export const model: Model = (currentState: State, res: ActionResponse): State => {
  let stateP: State = { ...currentState, ...{ log: [] } };

  if (isLeft(res)) {
    if (stateP.retryCount === 5) {
      stateP = {
        ...stateP,
        controlState: 'FATAL',
        error: res.left,
        log: [
          { level: 'error', message: 'Unable to complete action after 5 attempts, terminating.' },
        ],
      };
      return stateP;
    } else {
      const retryCount = stateP.retryCount + 1;
      const retryDelay = 1000 * Math.pow(2, retryCount); // 2s, 4s, 8s, 16s, 32s, 64s

      stateP = {
        ...stateP,
        retryCount,
        retryDelay,
        log: [
          {
            level: 'error',
            message:
              chalk.red('ERROR: ') +
              `Action failed with '${
                res.left.message
              }'. Retrying attempt ${retryCount} out of 5 in ${retryDelay / 1000} seconds.`,
          },
          ...stateP.log,
        ],
      };
      return stateP;
    }
  } else {
    // Reset retry count when an action succeeds
    stateP = { ...stateP, ...{ retryCount: 0, retryDelay: 0 } };
  }

  if (stateP.controlState === 'INIT') {
    if ('fetchIndices' in res.right) {
      const indices = res.right.fetchIndices;
      console.log('indices', indices);
      const aliases = Object.keys(indices).reduce((acc, index) => {
        Object.keys(indices[index].aliases || {}).forEach((alias) => {
          acc[alias] = index;
        });
        return acc;
      }, {} as Record<string, string>);
      // Object.entries(body).map(([indexName, indexInfo]) => ({
      //   index: indexName,
      //   ...indexInfo,
      // }))
      if (
        aliases['.kibana_current'] != null &&
        aliases['.kibana_7.11.0'] != null &&
        aliases['.kibana_current'] === aliases['.kibana_7.11.0']
      ) {
        // `.kibana_current` and the version specific aliases both exists and
        // are pointing to the same index. This version's migration has already
        // been completed.
        stateP = { ...stateP, controlState: 'DONE' };
        // TODO, go to step (6)
      } else if (
        aliases['.kibana_current'] != null &&
        gt(indexVersion(aliases['.kibana_current']), '7.11.0')
      ) {
        // `.kibana_current` is pointing to an index that belongs to a later
        // version of Kibana .e.g. a 7.11.0 node found `.kibana_7.12.0_001`
        stateP = {
          ...stateP,
          controlState: 'FATAL',
          error: new Error(
            'The .kibana_current alias is pointing to a newer version of Kibana: v' +
              indexVersion(aliases['.kibana_current'])
          ),
        };
      } else if (aliases['.kibana_current'] ?? aliases['.kibana'] ?? false) {
        //  The source index is:
        //  1. the index the `.kibana_current` alias points to, or if it doesn’t exist,
        //  2. the index the `.kibana` alias points to, or if it doesn't exist,
        const source = aliases['.kibana_current'] || aliases['.kibana'];
        stateP = {
          ...stateP,
          controlState: 'SET_SOURCE_WRITE_BLOCK',
          source,
          target: `.kibana_${stateP.kibanaVersion}_001`,
        };
      } else if (indices['.kibana'] != null) {
        // Migrate from a concrete index e.g. a < v6.5 `.kibana` index or a <
        // v7.4.0 `.kibana_task_manager` index.
        stateP = {
          ...stateP,
          controlState: 'REINDEX_SOURCE_TO_ALIAS',
          source: '.kibana',
          target: `.kibana_${stateP.kibanaVersion}_001`,
        };
      } else {
        // This cluster doesn't have an existing Saved Object index, create a
        // new version specific index.
        stateP = {
          ...stateP,
          controlState: 'INIT_NEW_INDICES',
          target: `.kibana_${stateP.kibanaVersion}_001`,
        };
      }
    }
    return stateP;
  } else if (stateP.controlState === 'SET_SOURCE_WRITE_BLOCK') {
    if ('setIndexWriteBlock' in res.right) {
      stateP = { ...stateP, controlState: 'CLONE_SOURCE' };
    }
    return stateP;
  } else if (stateP.controlState === 'CLONE_SOURCE') {
    if ('cloneIndex' in res.right) {
      stateP = { ...stateP, controlState: 'DONE' };
    }
    return stateP;
  } else if (stateP.controlState === 'REINDEX_SOURCE_TO_ALIAS') {
    stateP = {
      ...stateP,
      controlState: 'SET_SOURCE_WRITE_BLOCK',
      source: '', // `.kibana_n`
    };
    return stateP;
  } else if (
    stateP.controlState === 'DONE' ||
    stateP.controlState === 'FATAL' ||
    stateP.controlState === 'INIT_NEW_INDICES'
  ) {
    return stateP;
  } else {
    return throwBadControlState(stateP);
  }
};

export const next: NextAction = (client, state) => {
  // If for every state there is only one action (deterministic) we can define
  // next as a state -> action set.
  const delay = <F extends () => any>(fn: F): (() => ReturnType<F>) => {
    return () => {
      return state.retryDelay > 0
        ? new Promise((resolve) => setTimeout(resolve, state.retryDelay)).then(fn)
        : fn();
    };
  };

  if (state.controlState === 'INIT') {
    return delay(Actions.fetchIndices(client, ['.kibana', '.kibana_current', '.kibana_7.11.0']));
  } else if (state.controlState === 'SET_SOURCE_WRITE_BLOCK') {
    return delay(Actions.setIndexWriteBlock(client, state.source));
  } else if (state.controlState === 'CLONE_SOURCE') {
    return delay(Actions.cloneIndex(client, state.source, state.target));
  } else if (state.controlState === 'REINDEX_SOURCE_TO_ALIAS') {
    return null;
  } else if (state.controlState === 'INIT_NEW_INDICES') {
    return null;
  } else if (state.controlState === 'DONE' || state.controlState === 'FATAL') {
    return null; // Terminal state reached
  } else {
    return throwBadControlState(state);
  }
};

/**
 * A state-action machine for performing Saved Object Migrations.
 *
 * Based on https://www.microsoft.com/en-us/research/uploads/prod/2016/12/Computation-and-State-Machines.pdf
 *
 * The state-action machine defines it's behaviour in steps. Each step is a
 * transition from a state s_i to the state s_i+1 caused by an action a_i.
 *
 * s_i   -> a_i -> s_i+1
 * s_i+1 -> a_i+1 -> s_i+2
 *
 * Given a state s1, `next(s1)` returns the next action to execute. Actions are
 * asynchronous, once the action resolves, we can use the action response to
 * determine the next state to transition to as defined by the function
 * `model(state, response)`.
 *
 * We can then loosely define a step as:
 * s_i+1 = model(s_i, await next(s_i)())
 *
 * When there are no more actions returned by `next` the state-action machine
 * terminates.
 */
export async function migrationStateMachine(client: ElasticsearchClient, kibanaVersion: string) {
  let state: State = {
    controlState: 'INIT',
    kibanaVersion,
    aliases: {},
    source: '',
    target: '',
    retryCount: 0,
    retryDelay: 0,
    log: [],
  };

  let controlStateStepCounter = 0;

  console.log(chalk.magentaBright('INIT\n'), state);
  let nextTask = next(client, state);

  while (nextTask != null) {
    const actionResult = await nextTask();

    console.log(chalk.cyanBright('ACTION RESPONSE\n'), actionResult);

    const newState = model(state, actionResult);
    if (newState.log.length > 0) {
      newState.log.forEach((log) => console[log.level](log.message));
    }
    controlStateStepCounter =
      newState.controlState === state.controlState ? controlStateStepCounter + 1 : 0;
    if (controlStateStepCounter > 10) {
      throw new Error("Control state didn't change after 10 steps aborting.");
    }
    state = newState;
    console.log(chalk.magentaBright('STATE\n'), state);

    nextTask = next(client, state);
  }

  console.log(chalk.greenBright('DONE\n'), state);
}
