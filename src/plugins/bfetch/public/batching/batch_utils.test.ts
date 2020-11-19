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

import { BatchItem } from './types';
import { getDonePromise } from './batch_utils';
import { defer } from 'src/plugins/kibana_utils/common';

const tick = () => new Promise((resolve) => setTimeout(resolve, 1));

describe('getDonePromise()', () => {
  test('Triggers when aborted', async () => {
    const abortController = new AbortController();
    const item: BatchItem<any, any> = {
      future: defer<any>(),
      payload: null,
      done: false,
      signal: abortController.signal,
    };
    const b = getDonePromise(item);

    const spy = jest.fn();

    b.then(spy);

    abortController.abort();
    await tick();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(item.done).toBeTruthy();
  });

  test('Triggers when resolved', async () => {
    const abortController = new AbortController();
    const item: BatchItem<any, any> = {
      future: defer<any>(),
      payload: null,
      done: false,
      signal: abortController.signal,
    };
    const b = getDonePromise(item);

    const spy = jest.fn();

    b.then(spy);

    item.future.resolve(null);
    await tick();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(item.done).toBeTruthy();
  });

  test('Triggers when rejected', async () => {
    const abortController = new AbortController();
    const item: BatchItem<any, any> = {
      future: defer<any>(),
      payload: null,
      done: false,
      signal: abortController.signal,
    };
    const b = getDonePromise(item);

    const spy = jest.fn();

    b.then(spy);

    item.future.reject(null);
    await tick();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(item.done).toBeTruthy();
  });
});
