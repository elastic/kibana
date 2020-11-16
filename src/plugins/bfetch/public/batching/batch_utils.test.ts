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
import { getBatchDone$ } from './batch_utils';
import { defer } from 'src/plugins/kibana_utils/common';

const tick = () => new Promise((resolve) => setTimeout(resolve, 1));

describe('getBatchDone$()', () => {
  test('Triggers when all are aborted', async () => {
    const abortControllers = [new AbortController(), new AbortController()];
    const items: Array<BatchItem<any, any>> = [
      {
        future: defer<any>(),
        payload: null,
        done: false,
        signal: abortControllers[0].signal,
      },
      {
        future: defer<any>(),
        payload: null,
        done: false,
        signal: abortControllers[1].signal,
      },
    ];
    const b = getBatchDone$(items);

    const spy = {
      next: jest.fn(),
      complete: jest.fn(),
    };

    b.subscribe(spy);

    abortControllers[0].abort();
    await tick();
    expect(spy.next).toHaveBeenCalledTimes(0);

    abortControllers[1].abort();
    await tick();
    expect(spy.next).toHaveBeenCalledTimes(1);
    expect(spy.complete).toHaveBeenCalledTimes(1);
  });

  test('Triggers when all are resolved', async () => {
    const items: Array<BatchItem<any, any>> = [
      {
        future: defer<any>(),
        payload: null,
        done: false,
      },
      {
        future: defer<any>(),
        payload: null,
        done: false,
      },
    ];
    const b = getBatchDone$(items);

    const spy = {
      next: jest.fn(),
      complete: jest.fn(),
    };

    b.subscribe(spy);

    items[0].future.resolve(null);
    await tick();
    expect(spy.next).toHaveBeenCalledTimes(0);

    items[1].future.resolve(null);
    await tick();
    expect(spy.next).toHaveBeenCalledTimes(1);
    expect(spy.complete).toHaveBeenCalledTimes(1);
  });

  test('Triggers when its a mix', async () => {
    const abortController = new AbortController();
    const items: Array<BatchItem<any, any>> = [
      {
        future: defer<any>(),
        payload: null,
        done: false,
      },
      {
        future: defer<any>(),
        payload: null,
        done: false,
        signal: abortController.signal,
      },
    ];
    const b = getBatchDone$(items);

    const spy = {
      next: jest.fn(),
      complete: jest.fn(),
    };

    b.subscribe(spy);

    items[0].future.resolve(null);
    await tick();
    expect(spy.next).toHaveBeenCalledTimes(0);

    abortController.abort();
    await tick();
    expect(spy.next).toHaveBeenCalledTimes(1);
    expect(spy.complete).toHaveBeenCalledTimes(1);
  });

  test('Triggers correctly if an item is resolved then aborted', async () => {
    const abortController = new AbortController();
    const items: Array<BatchItem<any, any>> = [
      {
        future: defer<any>(),
        payload: null,
        done: false,
        signal: abortController.signal,
      },
      {
        future: defer<any>(),
        payload: null,
        done: false,
      },
    ];
    const b = getBatchDone$(items);

    const spy = {
      next: jest.fn(),
      complete: jest.fn(),
    };

    b.subscribe(spy);

    items[0].future.resolve(null);
    await tick();
    abortController.abort();
    await tick();
    expect(spy.next).toHaveBeenCalledTimes(0);

    items[1].future.resolve(null);
    await tick();
    expect(spy.next).toHaveBeenCalledTimes(1);
    expect(spy.complete).toHaveBeenCalledTimes(1);
  });

  test('Triggers correctly if an item is aborted then resolved', async () => {
    const abortController = new AbortController();
    const items: Array<BatchItem<any, any>> = [
      {
        future: defer<any>(),
        payload: null,
        done: false,
      },
      {
        future: defer<any>(),
        payload: null,
        done: false,
        signal: abortController.signal,
      },
    ];
    const b = getBatchDone$(items);

    const spy = {
      next: jest.fn(),
      complete: jest.fn(),
    };

    b.subscribe(spy);

    items[0].future.resolve(null);
    await tick();
    expect(spy.next).toHaveBeenCalledTimes(0);

    abortController.abort();
    await tick();
    items[1].future.resolve(null);
    await tick();
    expect(spy.next).toHaveBeenCalledTimes(1);
    expect(spy.complete).toHaveBeenCalledTimes(1);
  });
});
