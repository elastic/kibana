/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { TimedItemBuffer } from '../timed_item_buffer';
import { runItemBufferTests } from './run_item_buffer_tests';

jest.useFakeTimers({ legacyFakeTimers: true });

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
