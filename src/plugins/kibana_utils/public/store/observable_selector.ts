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

import { Observable, BehaviorSubject } from 'rxjs';

export type Selector<State, Result> = (state: State) => Result;
export type Comparator<Result> = (previous: Result, current: Result) => boolean;
export type Unsubscribe = () => void;

const defaultComparator: Comparator<any> = (previous, current) => previous === current;

export const observableSelector = <State extends {}, Result>(
  state: State,
  state$: Observable<State>,
  selector: Selector<State, Result>,
  comparator: Comparator<Result> = defaultComparator
): [Observable<Result>, Unsubscribe] => {
  let previousResult: Result = selector(state);
  const result$ = new BehaviorSubject<Result>(previousResult);

  const subscription = state$.subscribe(value => {
    const result = selector(value);
    const isEqual: boolean = comparator(previousResult, result);
    if (!isEqual) {
      result$.next(result);
    }
    previousResult = result;
  });

  return [(result$ as unknown) as Observable<Result>, subscription.unsubscribe];
};
