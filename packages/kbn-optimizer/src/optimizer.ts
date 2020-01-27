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

import * as Rx from 'rxjs';
import { mergeMap, map, tap } from 'rxjs/operators';
import { createFailError } from '@kbn/dev-utils';

import { observeWorker, WorkerStdio } from './observe_worker';
import { OptimizerConfig } from './optimizer_config';
import { CompilerState, WorkerMessage } from './common';
import { closure } from './closure';

export interface OptimizerStateSummary {
  type: CompilerState['type'];
  durSec: number;
  compilerStates: CompilerState[];
}

export type OptimizerState = OptimizerStateSummary | WorkerStdio;

const getSummaryType = (states: CompilerState[]) => {
  const types = states.map(s => s.type);

  if (types.includes('running')) {
    return 'running';
  }

  if (types.includes('compiler issue')) {
    return 'compiler issue';
  }

  if (types.every(s => s === 'compiler success')) {
    return 'compiler success';
  }

  throw new Error(`unable to summarize bundle states: ${JSON.stringify(states)}`);
};

export class Optimizer {
  constructor(private readonly config: OptimizerConfig) {}

  run() {
    return Rx.from(this.config.workers).pipe(
      mergeMap(worker => observeWorker(this.config, worker)),
      closure(msg$ => {
        let prevSummaryType: OptimizerStateSummary['type'] | undefined;
        let startTime = Date.now();
        const compilerStates: CompilerState[] = [];

        return msg$.pipe(
          map(
            (msg: WorkerMessage | WorkerStdio): OptimizerState => {
              if (msg.type === 'worker stdio') {
                return msg;
              }

              if (msg.type === 'worker error' || msg.type === 'compiler error') {
                const error = new Error(msg.errorMessage);
                error.stack = msg.errorStack;
                throw error;
              }

              const existingIndex = compilerStates.findIndex(s => s.id === msg.id);
              if (existingIndex === -1) {
                compilerStates.push(msg);
              } else {
                compilerStates.splice(existingIndex, 1, msg);
              }

              if (msg.type === 'compiler success') {
                this.config.cache.saveBundleModuleCount(msg.id, msg.moduleCount);
              }

              const type = getSummaryType(compilerStates);
              if (prevSummaryType !== 'running' && type === 'running') {
                // reset start time now that we are running again
                startTime = Date.now();
              }

              // stash summary type so we can reset startTime
              prevSummaryType = type;

              return {
                type,
                durSec: Math.round((Date.now() - startTime) / 100) / 10,
                compilerStates: Array.from(compilerStates),
              };
            }
          ),
          tap({
            complete: () => {
              if (this.config.watch) {
                throw new Error('workers unexpected closed in watch mode');
              }

              if (prevSummaryType !== 'compiler success') {
                throw createFailError('compilation failed');
              }
            },
          })
        );
      })
    );
  }
}
