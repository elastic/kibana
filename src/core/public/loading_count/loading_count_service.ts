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
import { pairwise, startWith } from 'rxjs/operators';

import { FatalErrorsStartContract } from '../fatal_errors';

interface Deps {
  fatalErrors: FatalErrorsStartContract;
}

export class LoadingCountService {
  private readonly count$ = new Rx.BehaviorSubject(0);
  private readonly subscriptions: Rx.Subscription[] = [];

  public start({ fatalErrors }: Deps) {
    return {
      add: (count$: Rx.Observable<number>) => {
        this.subscriptions.push(
          count$
            .pipe(
              startWith(0),
              pairwise()
            )
            .subscribe({
              next: ([prev, next]) => {
                const delta = next - prev;
                this.count$.next(this.count$.getValue() + delta);
              },
              error: error => {
                fatalErrors.add(error);
              },
            })
        );
      },

      getCount$: () => {
        return this.count$.asObservable();
      },
    };
  }

  public stop() {
    for (const subscription of this.subscriptions) {
      subscription.unsubscribe();
    }

    this.subscriptions.length = 0;
  }
}

export type LoadingCountStartContract = ReturnType<LoadingCountService['start']>;
