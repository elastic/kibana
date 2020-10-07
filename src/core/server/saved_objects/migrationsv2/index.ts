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
import * as Actions from './actions';
import { ActionResponse, ActionThunk } from './actions';

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

// Migration complete
export type DoneState = BaseState & {
  controlState: 'DONE';
};

// An error occurred, migration didn't succeed
export type FatalState = BaseState & {
  controlState: 'FATAL';
  error?: Error;
};

// Set a write block on the source index to prevent any further writes
export type SetSourceWriteBlockState = BaseState & {
  controlState: 'SET_SOURCE_WRITE_BLOCK';
};

// Blank ES cluster, create new kibana indices
export type InitNewIndicesState = BaseState & {
  controlState: 'INIT_NEW_INDICES';
};

// Create the target index by cloning the source index
export type CloneSourceState = BaseState & {
  controlState: 'CLONE_SOURCE';
};

export type State =
  | FatalState
  | InitState
  | DoneState
  | SetSourceWriteBlockState
  | InitNewIndicesState
  | CloneSourceState;

type Model = (currentState: State, result: ActionResponse) => State;
type NextAction = (client: ElasticsearchClient, state: State) => ActionThunk | null;

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
      stateP = {
        ...stateP,
        controlState: 'FATAL',
        error: res.left,
        retryCount: stateP.retryCount + 1,
        retryDelay: 1000 * Math.pow(2, stateP.retryCount + 1), // 2s, 4s, 8s, 16s, 32s, 64s
        log: [
          {
            level: 'error',
            message:
              chalk.red('ERROR: ') +
              `Action failed with '${res.left.message}'. Retrying attempt ${
                stateP.retryCount
              } out of 5 in ${stateP.retryDelay / 1000} seconds.`,
          },
          ...stateP.log,
        ],
      };
      return stateP;
    }
  } else if (stateP.controlState === 'INIT') {
    if ('fetchAliases' in res.right) {
      if (
        res.right.fetchAliases['.kibana_current'] != null &&
        res.right.fetchAliases['.kibana_7.11.0'] != null &&
        res.right.fetchAliases['.kibana_current'] === res.right.fetchAliases['.kibana_7.11.0']
      ) {
        // `.kibana_current` and the version specific aliases both exists and
        // are pointing to the same index. This version's migration has already
        // been completed.
        stateP = { ...stateP, controlState: 'DONE' };
        // TODO, go to step (6)
      } else if (
        res.right.fetchAliases['.kibana_current'] != null &&
        gt(indexVersion(res.right.fetchAliases['.kibana_current']), '7.11.0')
      ) {
        // `.kibana_current` is pointing to an index that belongs to a later
        // version of Kibana .e.g. a 7.11.0 node found `.kibana_7.12.0_001`
        stateP = {
          ...stateP,
          controlState: 'FATAL',
          error: new Error(
            'The .kibana_current alias is pointing to a newer version of Kibana: v' +
              indexVersion(res.right.fetchAliases['.kibana_current'])
          ),
        };
      } else if (
        res.right.fetchAliases['.kibana_current'] ??
        res.right.fetchAliases['.kibana'] ??
        false
      ) {
        //  The source index is:
        //  1. the index the `.kibana_current` alias points to, or if it doesn’t exist,
        //  2. the index the `.kibana` alias points to, or if it doesn't exist,
        const source =
          res.right.fetchAliases['.kibana_current'] || res.right.fetchAliases['.kibana'];
        stateP = {
          ...stateP,
          controlState: 'SET_SOURCE_WRITE_BLOCK',
          source,
          target: `.kibana_${stateP.kibanaVersion}_001`,
        };
      } else {
        // TODO: Check if we need to migrate from a v6.x `.kibana` index, source = '.kibana'
        // This cluster doesn't have any existing Kibana indices, create a new
        // version specific index.
        stateP = {
          ...stateP,
          controlState: 'INIT_NEW_INDICES',
          target: `.kibana_${stateP.kibanaVersion}_001`,
        };
      }
    }
    return stateP;
  } else if (stateP.controlState === 'SET_SOURCE_WRITE_BLOCK') {
    if ('setIndexWriteBlock' in res) {
      stateP = { ...stateP, controlState: 'CLONE_SOURCE' };
    }
    return stateP;
  } else if (stateP.controlState === 'CLONE_SOURCE') {
    if ('cloneIndex' in res) {
      stateP = { ...stateP, controlState: 'DONE' };
    }
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

export const next: NextAction = (client: ElasticsearchClient, state: State) => {
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
    return delay(Actions.fetchAliases(client, ['.kibana', '.kibana_current', '.kibana_7.11.0']));
  } else if (state.controlState === 'SET_SOURCE_WRITE_BLOCK') {
    return delay(Actions.setIndexWriteBlock(client, state.source));
  } else if (state.controlState === 'CLONE_SOURCE') {
    return delay(Actions.cloneIndex(client, state.source, state.target));
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
  let actionThunk: ActionThunk | null = next(client, state);

  while (actionThunk != null) {
    const actionResult = await actionThunk();

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

    actionThunk = next(client, state);
  }

  console.log(chalk.greenBright('DONE\n'), state);
}
