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
import * as Actions from './actions';

export type ControlState =
  | 'INIT' // Start
  | 'DONE' // Migration complete
  | 'FATAL' // An error occurred, migration didn't succeed
  | 'INIT_NEW_INDICES' // Blank ES cluster, create new kibana indices
  | 'SET_SOURCE_WRITE_BLOCK' // Set a write block on the source index to prevent any further writes
  | 'CLONE_SOURCE'; // Create the target index by cloning the source index

type ActionResponse =
  | Actions.CloneIndexResponse
  | Actions.FetchAliasesResponse
  | Actions.SetIndexWriteBlockResponse;
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type State = {
  controlState: ControlState;
  kibanaVersion: string;
  source: string;
  target: string;
  error?: Error;
  aliases: Record<string, string>;
  retryCount: number;
  retryDelay: number;
  log: Array<{ level: 'error' | 'info'; message: string }>;
};
type Model = (currentState: State, result: ActionResponse) => State;
type ActionThunk = () => Promise<ActionResponse>;
type NextAction = (client: ElasticsearchClient, state: State) => ActionThunk | null;

function throwBadControlState(p: never): never;
function throwBadControlState(controlState: any) {
  throw new Error('Unknown control state: ' + controlState);
}

function indexVersion(indexName: string) {
  return (indexName.match(/\.kibana_(\d+\.\d+\.\d+)_\d+/) || [])[1];
}

export const model: Model = (currentState: State, res: ActionResponse): State => {
  const stateP: State = { ...currentState, ...{ log: [] } };
  const control = stateP.controlState;

  if ('error' in res) {
    if (stateP.retryCount === 5) {
      stateP.error = res.error;
      stateP.controlState = 'FATAL';
      stateP.log = [
        { level: 'error', message: 'Unable to complete action after 5 attempts, terminating.' },
      ];
    } else {
      stateP.error = res.error;
      stateP.retryCount = stateP.retryCount + 1;
      stateP.retryDelay = 1000 * Math.pow(2, stateP.retryCount + 1); // 2s, 4s, 8s, 16s, 32s, 64s
      stateP.log = [
        {
          level: 'error',
          message:
            chalk.red('ERROR: ') +
            `Action failed with '${res.error.message}'. Retrying attempt ${
              stateP.retryCount
            } out of 5 in ${stateP.retryDelay / 1000} seconds.`,
        },
        ...stateP.log,
      ];
    }
  }

  if (control === 'INIT') {
    if ('fetchAliases' in res) {
      if (
        res.fetchAliases['.kibana_current'] != null &&
        res.fetchAliases['.kibana_7.11.0'] != null &&
        res.fetchAliases['.kibana_current'] === res.fetchAliases['.kibana_7.11.0']
      ) {
        // `.kibana_current` and the version specific aliases both exists and
        // are pointing to the same index. This version's migration has already
        // been completed.
        stateP.controlState = 'DONE';
        // TODO, go to step (6)
      } else if (
        res.fetchAliases['.kibana_current'] != null &&
        gt(indexVersion(res.fetchAliases['.kibana_current']), '7.11.0')
      ) {
        // `.kibana_current` is pointing to an index that belongs to a later
        // version of Kibana .e.g. a 7.11.0 node found `.kibana_7.12.0_001`
        stateP.controlState = 'FATAL';
        stateP.error = new Error(
          'The .kibana_current alias is pointing to a newer version of Kibana: v' +
            indexVersion(res.fetchAliases['.kibana_current'])
        );
      } else if (res.fetchAliases['.kibana_current'] ?? res.fetchAliases['.kibana'] ?? false) {
        //  The source index is:
        //  1. the index the `.kibana_current` alias points to, or if it doesn’t exist,
        //  2. the index the `.kibana` alias points to, or if it doesn't exist,
        const source = res.fetchAliases['.kibana_current'] || res.fetchAliases['.kibana'];

        stateP.controlState = 'SET_SOURCE_WRITE_BLOCK';
        stateP.source = source;
        stateP.target = `.kibana_${stateP.kibanaVersion}_001`;
      } else {
        // TODO: Check if we need to migrate from a v6.x `.kibana` index, source = '.kibana'
        // This cluster doesn't have any existing Kibana indices, create a new
        // version specific index.
        stateP.controlState = 'INIT_NEW_INDICES';
        stateP.target = `.kibana_${stateP.kibanaVersion}_001`;
      }
    }
    return stateP;
  } else if (control === 'SET_SOURCE_WRITE_BLOCK') {
    if ('setIndexWriteBlock' in res) {
      stateP.controlState = 'CLONE_SOURCE';
    }
    return stateP;
  } else if (control === 'CLONE_SOURCE') {
    if ('cloneIndex' in res) {
      stateP.controlState = 'DONE';
    }
    return stateP;
  } else if (control === 'DONE' || control === 'FATAL' || control === 'INIT_NEW_INDICES') {
    return stateP;
  } else {
    return throwBadControlState(control);
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
  const control = state.controlState;
  if (control === 'INIT') {
    return delay(Actions.fetchAliases(client, ['.kibana', '.kibana_current', '.kibana_7.11.0']));
  } else if (control === 'SET_SOURCE_WRITE_BLOCK') {
    return delay(Actions.setIndexWriteBlock(client, state.source));
  } else if (control === 'CLONE_SOURCE') {
    return delay(Actions.cloneIndex(client, state.source, state.target));
  } else if (control === 'FATAL' || control === 'INIT_NEW_INDICES') {
    return null;
  } else if (control === 'DONE') {
    return null; // DONE
  } else {
    return throwBadControlState(control);
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
    error: undefined,
    retryCount: 0,
    retryDelay: 0,
    log: [],
  };

  let controlStateStepCounter = 0;

  console.log(chalk.magentaBright('INIT\n'), state);
  let actionThunk: ActionThunk | null = next(client, state);

  while (actionThunk != null) {
    const actionResult = await actionThunk!().catch((error) => ({ error }));
    if (actionResult == null) {
      throw new Error('Action must return a result.');
    }
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
