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

import { createHash } from 'crypto';
import { inspect } from 'util';

import * as Rx from 'rxjs';
import { map, mergeMap, share } from 'rxjs/operators';

import { observeWorker, WorkerStatus } from './observe_worker';
import { OptimizerConfig } from './optimizer_config';
import { getOptimizerVersion } from './get_optimizer_version';
import { CompilerState, WorkerMessage, pipeClosure, Bundle, ascending, maybeMap } from './common';
import { assignBundlesToWorkers } from './assign_bundles_to_workers';
import { Watcher, ChangesStarted, Changes } from './watcher';
import { getMtimes } from './get_mtimes';

export interface OptimizerStateSummary {
  summary: 'initialized' | 'success' | 'running' | 'issue';
  version: string;
  startTime: number;
  durSec: number;
  compilerStates: CompilerState[];
  onlineBundles: Bundle[];
  offlineBundles: Bundle[];
  event?: ChangesStarted | Changes | WorkerMessage | WorkerStatus;
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

const getSummary = (states: CompilerState[]): OptimizerStateSummary['summary'] => {
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
};

export class Optimizer {
  constructor(private readonly config: OptimizerConfig) {}

  async getCachedBundles(optimizerVersion: string) {
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

    return eligible.filter(bundle => {
      const cacheKey = createHash('sha1')
        .update(
          (bundle.cache.getReferencedFiles() || [])
            .map(p => `${p}:${mtimes.get(p)}`)
            .sort(ascending(l => l))
            .join('\n')
        )
        .digest('hex');

      return cacheKey === bundle.cache.getKey();
    });
  }

  /**
   * Produce an observable that emits bundle objects when they
   * should become "online", meaning that the cache on disk is
   * no longer valid
   */
  watchBundlesForChanges$(bundles: Iterable<Bundle>) {
    return Watcher.using(watcher => {
      // copy the list of offline bundles
      const stillOffline = new Set(bundles);

      // recursively watch for changes in offline bundles until all the
      // offline bundles have gone online
      const nextBundlesToBringOnline$ = Rx.defer(() =>
        stillOffline.size ? watcher.getNextChange(stillOffline) : Rx.EMPTY
      ).pipe(
        mergeMap(
          (event): ReturnType<Watcher['getNextChange']> => {
            if (event.type === 'changes detected') {
              return Rx.of(event);
            }

            for (const bundle of event.bundles) {
              stillOffline.delete(bundle);
            }

            return Rx.concat([event], nextBundlesToBringOnline$);
          }
        )
      );

      return nextBundlesToBringOnline$;
    });
  }

  run() {
    return Rx.defer(
      async (): Promise<OptimizerStateSummary> => {
        const startTime = Date.now();
        const version = await getOptimizerVersion();
        const offlineBundles = this.config.cache ? await this.getCachedBundles(version) : [];
        const onlineBundles = this.config.bundles.filter(b => !offlineBundles.includes(b));

        return {
          summary: onlineBundles.length || this.config.watch ? 'initialized' : 'success',
          version,
          compilerStates: [],
          durSec: msToSec(Date.now() - startTime),
          offlineBundles,
          onlineBundles,
          startTime,
        };
      }
    ).pipe(
      mergeMap(init => {
        if (init.summary === 'success') {
          return [init];
        }

        const change$ = this.config.watch
          ? this.watchBundlesForChanges$(init.offlineBundles).pipe(share())
          : Rx.EMPTY;

        const workerMsg$ = Rx.concat(
          // first batch is all the workers which weren't initially cached
          Rx.of(init.onlineBundles),
          // subsequent batches are defined by our change listener
          change$.pipe(maybeMap(c => (c.type === 'changes' ? c.bundles : undefined)))
        ).pipe(
          mergeMap(bundles =>
            Rx.from(assignBundlesToWorkers(bundles, this.config.maxWorkerCount)).pipe(
              mergeMap(assignment =>
                observeWorker(
                  this.config,
                  this.config.getWorkerConfig(init.version),
                  assignment.bundles
                )
              )
            )
          )
        );

        return Rx.concat(
          Rx.of(init),
          Rx.merge(change$, workerMsg$).pipe(
            pipeClosure(event$ => {
              let prev = init;

              const nextUpdate = (
                event: NonNullable<OptimizerStateSummary['event']>,
                changes?: Partial<Omit<OptimizerStateSummary, 'event' | 'version' | 'durSec'>>
              ): OptimizerStateSummary => {
                const startTime = changes?.startTime ?? prev.startTime;
                const next = {
                  ...prev,
                  ...changes,
                  event,
                  startTime,
                  durSec: msToSec(Date.now() - startTime),
                };
                prev = next;
                return next;
              };

              return event$.pipe(
                map(
                  (event): OptimizerStateSummary => {
                    if (event.type === 'worker error' || event.type === 'compiler error') {
                      // unrecoverable error states
                      const error = new Error(event.errorMessage);
                      error.stack = event.errorStack;
                      throw error;
                    }

                    if (event.type === 'worker stdio' || event.type === 'worker started') {
                      return nextUpdate(event);
                    }

                    if (event.type === 'changes detected') {
                      // switch to running early, before workers are started, so that
                      // base path proxy can prevent requests in the delay between changes
                      // and workers started
                      return nextUpdate(event, {
                        summary: 'running',
                      });
                    }

                    if (event.type === 'changes') {
                      const onlineBundles: Bundle[] = [];
                      const offlineBundles: Bundle[] = [];
                      for (const bundle of this.config.bundles) {
                        if (prev.onlineBundles.includes(bundle) || event.bundles.includes(bundle)) {
                          onlineBundles.push(bundle);
                        } else {
                          offlineBundles.push(bundle);
                        }
                      }

                      return nextUpdate(event, {
                        summary: 'running',
                        onlineBundles,
                        offlineBundles,
                        startTime: prev.summary === 'running' ? prev.startTime : Date.now(),
                      });
                    }

                    if (
                      event.type === 'compiler issue' ||
                      event.type === 'compiler success' ||
                      event.type === 'running'
                    ) {
                      const compilerStates: CompilerState[] = [
                        ...prev.compilerStates.filter(c => c.bundleId !== event.bundleId),
                        event,
                      ];
                      const summary = getSummary(compilerStates);
                      const newStartTime =
                        prev.summary !== 'running' && summary === 'running'
                          ? Date.now()
                          : prev.startTime;

                      return nextUpdate(event, {
                        summary,
                        compilerStates,
                        startTime: newStartTime,
                      });
                    }

                    throw new Error(`unexpected optimizer event ${inspect(event)}`);
                  }
                )
              );
            })
          )
        );
      })
    );
  }
}
