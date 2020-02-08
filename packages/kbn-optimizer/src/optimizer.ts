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
import { scan, mergeMap, share, distinctUntilChanged } from 'rxjs/operators';

import { observeWorker, WorkerStatus } from './observe_worker';
import { OptimizerConfig } from './optimizer_config';
import { getOptimizerVersion } from './get_optimizer_version';
import { CompilerMsg, WorkerMsg, pipeClosure, Bundle, maybeMap } from './common';
import { assignBundlesToWorkers } from './assign_bundles_to_workers';
import { Watcher, ChangesStarted, Changes } from './watcher';
import { getMtimes } from './get_mtimes';

export interface OptimizerInitializedEvent {
  type: 'optimizer initialized';
}

export type OptimizerEvent =
  | OptimizerInitializedEvent
  | ChangesStarted
  | Changes
  | WorkerMsg
  | WorkerStatus;

export interface OptimizerMsg {
  state: OptimizerState;
  event?: OptimizerEvent;
}

export interface OptimizerState {
  phase: 'initialized' | 'reallocating' | 'success' | 'running' | 'issue';
  version: string;
  startTime: number;
  durSec: number;
  compilerStates: CompilerMsg[];
  onlineBundles: Bundle[];
  offlineBundles: Bundle[];
}

export interface OptimizerStartedWorker {
  type: 'worker started';
  bundles: Bundle[];
}

export interface OptimizerComingOnline {
  type: 'bringing bundle online';
  bundle: Bundle;
}

export { ChangesStarted };
export type OptimizerNotif = OptimizerStartedWorker;

const msToSec = (ms: number) => Math.round(ms / 100) / 10;

export class Optimizer {
  constructor(private readonly config: OptimizerConfig) {}

  private async getCachedBundles(optimizerVersion: string) {
    const eligible = this.config.bundles.filter(
      // only get the mtimes for files if the bundle was built
      // with our version of the optimizer and there is a cache key
      b => b.cache.getOptimizerVersion() === optimizerVersion && !!b.cache.getKey()
    );

    if (!eligible.length) {
      return [];
    }

    const mtimes = await getMtimes(
      new Set<string>(
        eligible.reduce(
          (acc: string[], bundle) => [...acc, ...(bundle.cache.getReferencedFiles() || [])],
          []
        )
      )
    );

    return eligible.filter(
      bundle =>
        bundle.cache.getKey() ===
        bundle.createCacheKey(bundle.cache.getReferencedFiles() || [], mtimes)
    );
  }

  /**
   * Create an observable that emits change events for offline
   * bundles.
   *
   * Once changes are seen in a bundle that bundles
   * files will no longer be watched.
   *
   * Once changes have been seen in all bundles changeEvent$
   * will complete.
   *
   * If there are no bundles to watch or we config.watch === false
   * the observable completes without sending any notifications.
   */
  private watchBundlesForChanges$(initialBundles: Bundle[], initialStartTime: number) {
    if (!this.config.watch || !initialBundles.length) {
      return Rx.EMPTY;
    }

    return Watcher.using(watcher => {
      /**
       * Recursively call watcher.getNextChange$, passing it
       * just the bundles that haven't been changed yet until
       * all bundles have changed, then exit
       */
      const recursiveGetNextChange$ = (
        bundles: Bundle[],
        startTime: number
      ): ReturnType<Watcher['getNextChange$']> =>
        !bundles.length
          ? Rx.EMPTY
          : watcher.getNextChange$(bundles, startTime).pipe(
              mergeMap(event => {
                if (event.type === 'changes detected') {
                  return Rx.of(event);
                }

                return Rx.concat(
                  Rx.of(event),

                  recursiveGetNextChange$(
                    bundles.filter(b => !event.bundles.includes(b)),
                    Date.now()
                  )
                );
              })
            );

      return recursiveGetNextChange$(initialBundles, initialStartTime);
    });
  }

  /**
   * Create a stream of all worker events, these include messages
   * from workers and events about the status of workers. To get
   * these events we assign the bundles to workers via
   * `assignBundlesToWorkers()` and then start a worler for each
   * assignment with `observeWorker()`.
   *
   * Subscribes to `changeEvent$` in order to determine when more
   * bundles should be assigned to workers.
   *
   * Completes when all workers have exitted. If we are running in
   * watch mode this observable will never exit.
   */
  private runWorkers(
    initState: OptimizerState,
    changeEvent$: Rx.Observable<Changes | ChangesStarted>
  ) {
    return Rx.concat(
      // first batch of bundles are based on how up-to-date the cache is
      Rx.of(initState.onlineBundles),
      // subsequent batches are defined by changeEvent$
      changeEvent$.pipe(maybeMap(c => (c.type === 'changes' ? c.bundles : undefined)))
    ).pipe(
      mergeMap(bundles =>
        Rx.from(assignBundlesToWorkers(bundles, this.config.maxWorkerCount)).pipe(
          mergeMap(assignment =>
            observeWorker(
              this.config,
              this.config.getWorkerConfig(initState.version),
              assignment.bundles
            )
          )
        )
      )
    );
  }

  /**
   * merge a state and some updates into a new optimizer state, apply some
   * standard updates related to timing, and wrap it up with an event to
   * create an OptimizerMsg
   */
  private createOptimizerMsg(
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
  private getStatePhase(states: CompilerMsg[]) {
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
  private summarizeOptimizerEvent$(initMsg: OptimizerMsg, event$: Rx.Observable<OptimizerEvent>) {
    return event$.pipe(
      scan((prevMsg, event) => {
        const { state } = prevMsg;

        if (event.type === 'optimizer initialized') {
          if (state.onlineBundles.length === 0) {
            // all bundles are cached so we transition to success
            return this.createOptimizerMsg(state, event, {
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
          return this.createOptimizerMsg(state, event);
        }

        if (event.type === 'changes detected') {
          // switch to running early, before workers are started, so that
          // base path proxy can prevent requests in the delay between changes
          // and workers started
          return this.createOptimizerMsg(state, event, {
            phase: 'reallocating',
          });
        }

        if (event.type === 'changes') {
          const onlineBundles: Bundle[] = [];
          const offlineBundles: Bundle[] = [];
          for (const bundle of this.config.bundles) {
            if (state.onlineBundles.includes(bundle) || event.bundles.includes(bundle)) {
              onlineBundles.push(bundle);
            } else {
              offlineBundles.push(bundle);
            }
          }

          return this.createOptimizerMsg(state, event, {
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
          return this.createOptimizerMsg(state, event, {
            phase: this.getStatePhase(compilerStates),
            compilerStates,
          });
        }

        throw new Error(`unexpected optimizer event ${inspect(event)}`);
      }, initMsg),

      // returning the previous message is how we indicate
      // that an event should be dropped
      distinctUntilChanged()
    );
  }

  run() {
    // initialize the optimizer by figuring out which bundles are cached, which bundles
    const init$ = Rx.defer(
      async (): Promise<OptimizerMsg> => {
        const startTime = Date.now();
        const version = await getOptimizerVersion(this.config);
        const offlineBundles = this.config.cache ? await this.getCachedBundles(version) : [];
        const onlineBundles = this.config.bundles.filter(b => !offlineBundles.includes(b));

        return this.createOptimizerMsg({
          phase: 'initialized',
          version,
          compilerStates: [],
          durSec: msToSec(Date.now() - startTime),
          offlineBundles,
          onlineBundles,
          startTime,
        });
      }
    );

    return init$.pipe(
      mergeMap(
        (init): Rx.Observable<OptimizerMsg> => {
          const { state: initState } = init;

          const changeEvent$ = this.watchBundlesForChanges$(
            initState.offlineBundles,
            initState.startTime
          ).pipe(share());
          const workerEvent$ = this.runWorkers(initState, changeEvent$);

          // event to kick off the summarizer
          const initEvent: OptimizerInitializedEvent = {
            type: 'optimizer initialized',
          };

          return Rx.concat(
            Rx.of(init),
            this.summarizeOptimizerEvent$(
              init,
              Rx.merge(Rx.of(initEvent), changeEvent$, workerEvent$)
            )
          );
        }
      )
    );
  }
}
