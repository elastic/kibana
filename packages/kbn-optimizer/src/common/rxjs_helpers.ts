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
import { mergeMap, tap, debounceTime, map } from 'rxjs/operators';

type Operator<T1, T2> = (source: Rx.Observable<T1>) => Rx.Observable<T2>;
type MapFn<T1, T2> = (item: T1, index: number) => T2;

/**
 * Wrap an operator chain in a closure so that it can have some local
 * state. The `fn` is called each time the returned observable is
 * subscribed; the closure is recreated for each subscription.
 */
export const pipeClosure = <T1, T2>(fn: Operator<T1, T2>): Operator<T1, T2> => {
  return (source: Rx.Observable<T1>) => {
    return Rx.defer(() => fn(source));
  };
};

/**
 * An operator that filters out undefined values from the stream while
 * supporting TypeScript
 */
export const maybe = <T1>(): Operator<T1 | undefined, T1> => {
  return mergeMap(item => (item === undefined ? Rx.EMPTY : [item]));
};

/**
 * An operator like map(), but undefined values are filered out automatically
 * with TypeScript support. For some reason TS doesn't have great support for
 * filter's without defining an explicit type assertion in the signature of
 * the filter.
 */
export const maybeMap = <T1, T2>(fn: MapFn<T1, undefined | T2>): Operator<T1, T2> => {
  return mergeMap((item, index) => {
    const result = fn(item, index);
    return result === undefined ? Rx.EMPTY : [result];
  });
};

/**
 * Debounce received notifications and write them to a buffer. Once the source
 * has been silent for `ms` milliseconds the buffer is flushed as a single array
 * to the destination stream
 */
export const debounceTimeBuffer = <T>(ms: number) =>
  pipeClosure((source$: Rx.Observable<T>) => {
    const buffer: T[] = [];
    return source$.pipe(
      tap(item => buffer.push(item)),
      debounceTime(ms),
      map(() => {
        const items = Array.from(buffer);
        buffer.length = 0;
        return items;
      })
    );
  });
