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

import { TimedItemBuffer } from '../timed_item_buffer';
import { runItemBufferTests } from './run_item_buffer_tests';

jest.useFakeTimers();

beforeEach(() => {
  jest.clearAllTimers();
});

describe('TimedItemBuffer', () => {
  runItemBufferTests(TimedItemBuffer);

  test('does not do unnecessary flushes', () => {
    const onFlush = jest.fn();
    const buf = new TimedItemBuffer({
      onFlush,
      maxItemAge: 3,
    });

    expect(onFlush).toHaveBeenCalledTimes(0);
    buf.write(0);
    expect(onFlush).toHaveBeenCalledTimes(0);
    buf.flush();
    expect(onFlush).toHaveBeenCalledTimes(1);
  });

  test('does not do extra flush after timeout if buffer was flushed during timeout wait', () => {
    const onFlush = jest.fn();
    const buf = new TimedItemBuffer({
      onFlush,
      maxItemAge: 10,
    });

    buf.write(0);
    jest.advanceTimersByTime(3);
    buf.flush();
    jest.advanceTimersByTime(11);

    expect(onFlush).toHaveBeenCalledTimes(1);
  });

  test('flushes buffer automatically after timeout reached', () => {
    const onFlush = jest.fn();
    const buf = new TimedItemBuffer({
      onFlush,
      maxItemAge: 2,
    });

    buf.write(1);
    buf.write(2);
    expect(onFlush).toHaveBeenCalledTimes(0);

    jest.advanceTimersByTime(3);
    expect(onFlush).toHaveBeenCalledTimes(1);
    expect(onFlush).toHaveBeenCalledWith([1, 2]);
  });

  test('does not call flush after timeout if flush was triggered because buffer size reached', () => {
    const onFlush = jest.fn();
    const buf = new TimedItemBuffer({
      onFlush,
      flushOnMaxItems: 2,
      maxItemAge: 2,
    });

    buf.write(1);
    buf.write(2);

    expect(onFlush).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(3);
    expect(onFlush).toHaveBeenCalledTimes(1);
  });

  test('does not automatically flush if `.clear()` was called', () => {
    const onFlush = jest.fn();
    const buf = new TimedItemBuffer({
      onFlush,
      flushOnMaxItems: 25,
      maxItemAge: 5,
    });

    buf.write(1);
    buf.write(2);
    jest.advanceTimersByTime(1);
    buf.clear();

    expect(onFlush).toHaveBeenCalledTimes(0);
    jest.advanceTimersByTime(6);
    expect(onFlush).toHaveBeenCalledTimes(0);
  });
});
