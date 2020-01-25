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

type Operator<T1, T2> = (source: Rx.Observable<T1>) => Rx.Observable<T2>;

/**
 * Wrap an operator chain in a closure so that is can have some local state
 *
 * This could also be done with new Rx.Obseravble(...) but that gives
 * the closure access to the subscriber, and I often wish I didn't have
 * access to such a powerful/dangerous object.
 *
 * Using closure makes sure that only operators are used so errors
 * and subscriptions are managed correctly without worry.
 */
export const closure = <T1, T2>(fn: Operator<T1, T2>): Operator<T1, T2> => {
  return (source: Rx.Observable<T1>) => {
    return new Rx.Observable<T2>(subscriber => {
      return fn(source).subscribe(subscriber);
    });
  };
};
