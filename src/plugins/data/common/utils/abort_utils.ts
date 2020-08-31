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
 * Class used to signify that something was aborted. Useful for applications to conditionally handle
 * this type of error differently than other errors.
 */
export class AbortError extends Error {
  constructor(message = 'Aborted') {
    super(message);
    this.message = message;
    this.name = 'AbortError';
  }
}

/**
 * Returns a `Promise` corresponding with when the given `AbortSignal` is aborted. Useful for
 * situations when you might need to `Promise.race` multiple `AbortSignal`s, or an `AbortSignal`
 * with any other expected errors (or completions).
 *
 * @param signal The `AbortSignal` to generate the `Promise` from
 */
export function toPromise(signal: AbortSignal): Promise<never> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) reject(new AbortError());
    const abortHandler = () => {
      signal.removeEventListener('abort', abortHandler);
      reject(new AbortError());
    };
    signal.addEventListener('abort', abortHandler);
  });
}

/**
 * Returns an `AbortSignal` that will be aborted when the first of the given signals aborts.
 *
 * @param signals
 */
export function getCombinedSignal(signals: AbortSignal[]) {
  const controller = new AbortController();
  if (signals.some((signal) => signal.aborted)) {
    controller.abort();
  } else {
    const promises = signals.map((signal) => toPromise(signal));
    Promise.race(promises).catch(() => controller.abort());
  }
  return controller.signal;
}
