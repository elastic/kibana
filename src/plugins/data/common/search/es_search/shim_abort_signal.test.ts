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

import { shimAbortSignal } from './shim_abort_signal';

const createSuccessTransportRequestPromise = (
  body: any,
  { statusCode = 200 }: { statusCode?: number } = {}
) => {
  const promise = Promise.resolve({ body, statusCode }) as any;
  promise.abort = jest.fn();

  return promise;
};

describe('shimAbortSignal', () => {
  test('aborts the promise if the signal is aborted', () => {
    const promise = createSuccessTransportRequestPromise({
      success: true,
    });
    const controller = new AbortController();
    shimAbortSignal(promise, controller.signal);
    controller.abort();

    expect(promise.abort).toHaveBeenCalled();
  });

  test('returns the original promise', async () => {
    const promise = createSuccessTransportRequestPromise({
      success: true,
    });
    const controller = new AbortController();
    const response = await shimAbortSignal(promise, controller.signal);

    expect(response).toEqual(expect.objectContaining({ body: { success: true } }));
  });

  test('allows the promise to be aborted manually', () => {
    const promise = createSuccessTransportRequestPromise({
      success: true,
    });
    const controller = new AbortController();
    const enhancedPromise = shimAbortSignal(promise, controller.signal);

    enhancedPromise.abort();
    expect(promise.abort).toHaveBeenCalled();
  });
});
