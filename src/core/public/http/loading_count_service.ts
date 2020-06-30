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

import { BehaviorSubject, Observable, Subject } from 'rxjs';
import {
  distinctUntilChanged,
  endWith,
  map,
  pairwise,
  startWith,
  takeUntil,
  tap,
} from 'rxjs/operators';
import { FatalErrorsSetup } from '../fatal_errors';
import { CoreService } from '../../types';

/** @public */
export interface LoadingCountSetup {
  addLoadingCountSource(countSource$: Observable<number>): void;

  getLoadingCount$(): Observable<number>;
}

/**
 * See {@link LoadingCountSetup}.
 * @public
 */
export type LoadingCountStart = LoadingCountSetup;

/** @internal */
export class LoadingCountService implements CoreService<LoadingCountSetup, LoadingCountStart> {
  private readonly stop$ = new Subject();
  private readonly loadingCount$ = new BehaviorSubject(0);

  public setup({ fatalErrors }: { fatalErrors: FatalErrorsSetup }) {
    return {
      getLoadingCount$: () => this.loadingCount$.pipe(distinctUntilChanged()),
      addLoadingCountSource: (count$: Observable<number>) => {
        count$
          .pipe(
            distinctUntilChanged(),

            tap((count) => {
              if (count < 0) {
                throw new Error(
                  'Observables passed to loadingCount.add() must only emit positive numbers'
                );
              }
            }),

            // use takeUntil() so that we can finish each stream on stop() the same way we do when they complete,
            // by removing the previous count from the total
            takeUntil(this.stop$),
            endWith(0),
            startWith(0),
            pairwise(),
            map(([prev, next]) => next - prev)
          )
          .subscribe({
            next: (delta) => {
              this.loadingCount$.next(this.loadingCount$.getValue() + delta);
            },
            error: (error) => fatalErrors.add(error),
          });
      },
    };
  }

  public start({ fatalErrors }: { fatalErrors: FatalErrorsSetup }) {
    return this.setup({ fatalErrors });
  }

  public stop() {
    this.stop$.next();
    this.loadingCount$.complete();
  }
}
