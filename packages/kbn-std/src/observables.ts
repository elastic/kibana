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

import { Observable } from 'rxjs';
import { first, last, take, takeLast, toArray } from 'rxjs/operators';

export function firstValueFrom<T>(observable: Observable<T>): Promise<T> {
  // type casting required for rxjs v7
  return observable.pipe(first()).toPromise() as Promise<T>;
}

export function optionalFirstValueFrom<T>(observable: Observable<T>): Promise<T | undefined> {
  return observable.pipe(take(1)).toPromise();
}

export function lastValueFrom<T>(observable: Observable<T>): Promise<T> {
  // type casting required for rxjs v7
  return observable.pipe(last()).toPromise() as Promise<T>;
}

export function optionalLastValueFrom<T>(observable: Observable<T>): Promise<T | undefined> {
  return observable.pipe(takeLast(1)).toPromise();
}

export function allValuesFrom<T>(observable: Observable<T>): Promise<T[]> {
  return lastValueFrom(observable.pipe(toArray()));
}
