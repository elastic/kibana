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
import { tap } from 'rxjs/operators';
import { createFailError } from '@kbn/dev-utils';

import { pipeClosure, Update } from '../common';

import { OptimizerState } from './optimizer_state';
import { OptimizerConfig } from './optimizer_config';

export function handleOptimizerCompletion(config: OptimizerConfig) {
  return pipeClosure((source$: Rx.Observable<Update<any, OptimizerState>>) => {
    let prevState: OptimizerState | undefined;

    return source$.pipe(
      tap({
        next: update => {
          prevState = update.state;
        },
        complete: () => {
          if (config.watch) {
            throw new Error('optimizer unexpectedly completed when in watch mode');
          }

          if (prevState?.phase === 'success') {
            return;
          }

          if (prevState?.phase === 'issue') {
            throw createFailError('webpack issue');
          }

          throw new Error(`optimizer unexpectedly exit in phase "${prevState?.phase}"`);
        },
      })
    );
  });
}
