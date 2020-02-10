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

import { inspect } from 'util';

import * as Rx from 'rxjs';
import { scan, distinctUntilChanged } from 'rxjs/operators';

import { WorkerMsg, CompilerMsg, Bundle } from '../common';

import { ChangeEvent } from './watcher';
import { WorkerStatus } from './observe_worker';
import { BundleCacheEvent } from './bundle_cache';
import { OptimizerConfig } from './optimizer_config';

export interface OptimizerInitializedEvent {
  type: 'optimizer initialized';
}

export type OptimizerEvent =
  | OptimizerInitializedEvent
  | ChangeEvent
  | WorkerMsg
  | WorkerStatus
  | BundleCacheEvent;

export interface OptimizerMsg {
  state: OptimizerState;
  event?: OptimizerEvent;
}

export interface OptimizerState {
  phase: 'initialized' | 'reallocating' | 'success' | 'running' | 'issue';
  startTime: number;
  durSec: number;
  compilerStates: CompilerMsg[];
  onlineBundles: Bundle[];
  offlineBundles: Bundle[];
}

const msToSec = (ms: number) => Math.round(ms / 100) / 10;

/**
 * merge a state and some updates into a new optimizer state, apply some
 * standard updates related to timing, and wrap it up with an event to
 * create an OptimizerMsg
 */
export function createOptimizerMsg(
  prevState: OptimizerState,
  event?: OptimizerEvent,
  stateUpdate?: Partial<Omit<OptimizerState, 'version' | 'durSec' | 'startTime'>>
): OptimizerMsg {
  // reset start time if we are transitioning into running
  const startTime =
    (prevState.phase === 'success' || prevState.phase === 'issue') &&
    (stateUpdate?.phase === 'running' || stateUpdate?.phase === 'reallocating')
      ? Date.now()
      : prevState.startTime;

  return {
    event,
    state: {
      ...prevState,
      ...stateUpdate,
      startTime,
      durSec: msToSec(Date.now() - startTime),
    },
  };
}

/**
 * calculate the total state, given a set of compiler messages
 */
function getStatePhase(states: CompilerMsg[]) {
  const types = states.map(s => s.type);

  if (types.includes('running')) {
    return 'running';
  }

  if (types.includes('compiler issue')) {
    return 'issue';
  }

  if (types.every(s => s === 'compiler success')) {
    return 'success';
  }

  throw new Error(`unable to summarize bundle states: ${JSON.stringify(states)}`);
}

/**
 * Convert a stream of OptimizerEvents into the public stream of
 * OptimizerMsgs. The resulting state reflects the total state
 * of all bundles and workers.
 */
export function summarizeOptimizerEvent$(
  config: OptimizerConfig,
  initialStartTime: number,
  event$: Rx.Observable<OptimizerEvent>
) {
  return event$.pipe(
    scan(
      (prevMsg, event) => {
        const { state } = prevMsg;

        if (event.type === 'optimizer initialized') {
          if (state.onlineBundles.length === 0) {
            // all bundles are cached so we transition to success
            return createOptimizerMsg(state, event, {
              phase: 'success',
            });
          }

          // no state change necessary
          return prevMsg;
        }

        if (event.type === 'worker error' || event.type === 'compiler error') {
          // unrecoverable error states
          const error = new Error(event.errorMsg);
          error.stack = event.errorStack;
          throw error;
        }

        if (event.type === 'worker stdio' || event.type === 'worker started') {
          return createOptimizerMsg(state, event);
        }

        if (event.type === 'changes detected') {
          // switch to running early, before workers are started, so that
          // base path proxy can prevent requests in the delay between changes
          // and workers started
          return createOptimizerMsg(state, event, {
            phase: 'reallocating',
          });
        }

        if (
          event.type === 'changes' ||
          event.type === 'bundle cached' ||
          event.type === 'bundle not cached'
        ) {
          const onlineBundles: Bundle[] = [...state.onlineBundles];
          if (event.type === 'changes') {
            onlineBundles.push(...event.bundles);
          }
          if (event.type === 'bundle not cached') {
            onlineBundles.push(event.bundle);
          }

          const offlineBundles: Bundle[] = [];
          for (const bundle of config.bundles) {
            if (!onlineBundles.includes(bundle)) {
              offlineBundles.push(bundle);
            }
          }

          return createOptimizerMsg(state, event, {
            phase: 'running',
            onlineBundles,
            offlineBundles,
          });
        }

        if (
          event.type === 'compiler issue' ||
          event.type === 'compiler success' ||
          event.type === 'running'
        ) {
          const compilerStates: CompilerMsg[] = [
            ...state.compilerStates.filter(c => c.bundleId !== event.bundleId),
            event,
          ];
          return createOptimizerMsg(state, event, {
            phase: getStatePhase(compilerStates),
            compilerStates,
          });
        }

        throw new Error(`unexpected optimizer event ${inspect(event)}`);
      },
      createOptimizerMsg({
        compilerStates: [],
        durSec: 0,
        offlineBundles: [],
        onlineBundles: [],
        phase: 'success',
        startTime: initialStartTime,
      })
    ),

    // returning the previous message is how we indicate
    // that an event should be dropped
    distinctUntilChanged()
  );
}
