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

/**
 * An externally resolvable/rejectable "promise". Use it to resolve/reject
 * promise at any time.
 *
 * ```ts
 * const future = new Defer();
 *
 * future.promise.then(value => console.log(value));
 *
 * future.resolve(123);
 * ```
 */
export class Defer<T> {
  public readonly resolve!: (data: T) => void;
  public readonly reject!: (error: any) => void;
  public readonly promise: Promise<T> = new Promise<T>((resolve, reject) => {
    (this as any).resolve = resolve;
    (this as any).reject = reject;
  });
}

export const defer = <T>() => new Defer<T>();
