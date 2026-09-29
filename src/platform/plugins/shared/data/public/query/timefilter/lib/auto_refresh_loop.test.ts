/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

import type { AutoRefreshDoneFn } from './auto_refresh_loop';
import { createAutoRefreshLoop } from './auto_refresh_loop';

vi.useFakeTimers({ legacyFakeTimers: true });

test('triggers refresh with interval', () => {
  const { loop$, start, stop } = createAutoRefreshLoop();

  const fn = vi.fn((done) => done());
  loop$.subscribe(fn);

  vi.advanceTimersByTime(5000);
  expect(fn).not.toHaveBeenCalled();

  start(1000);

  vi.advanceTimersByTime(1001);
  expect(fn).toHaveBeenCalledTimes(1);

  vi.advanceTimersByTime(1001);
  expect(fn).toHaveBeenCalledTimes(2);

  stop();

  vi.advanceTimersByTime(5000);
  expect(fn).toHaveBeenCalledTimes(2);
});

test('waits for done() to be called', () => {
  const { loop$, start } = createAutoRefreshLoop();

  let done!: AutoRefreshDoneFn;
  const fn = vi.fn((_done) => {
    done = _done;
  });
  loop$.subscribe(fn);
  start(1000);

  vi.advanceTimersByTime(1001);
  expect(fn).toHaveBeenCalledTimes(1);
  expect(done).toBeInstanceOf(Function);

  vi.advanceTimersByTime(1001);
  expect(fn).toHaveBeenCalledTimes(1);

  done();

  vi.advanceTimersByTime(500);
  expect(fn).toHaveBeenCalledTimes(1);
  vi.advanceTimersByTime(501);
  expect(fn).toHaveBeenCalledTimes(2);
});

test('waits for done() from multiple subscribers to be called', () => {
  const { loop$, start } = createAutoRefreshLoop();

  let done1!: AutoRefreshDoneFn;
  const fn1 = vi.fn((_done) => {
    done1 = _done;
  });
  loop$.subscribe(fn1);

  let done2!: AutoRefreshDoneFn;
  const fn2 = vi.fn((_done) => {
    done2 = _done;
  });
  loop$.subscribe(fn2);

  start(1000);

  vi.advanceTimersByTime(1001);
  expect(fn1).toHaveBeenCalledTimes(1);
  expect(done1).toBeInstanceOf(Function);

  vi.advanceTimersByTime(1001);
  expect(fn1).toHaveBeenCalledTimes(1);

  done1();

  vi.advanceTimersByTime(500);
  expect(fn1).toHaveBeenCalledTimes(1);
  vi.advanceTimersByTime(501);
  expect(fn1).toHaveBeenCalledTimes(1);

  done2();

  vi.advanceTimersByTime(500);
  expect(fn1).toHaveBeenCalledTimes(1);
  vi.advanceTimersByTime(501);
  expect(fn1).toHaveBeenCalledTimes(2);
});

test('unsubscribe() resets the state', () => {
  const { loop$, start } = createAutoRefreshLoop();

  let done1!: AutoRefreshDoneFn;
  const fn1 = vi.fn((_done) => {
    done1 = _done;
  });
  loop$.subscribe(fn1);

  const fn2 = vi.fn();
  const sub2 = loop$.subscribe(fn2);

  start(1000);

  vi.advanceTimersByTime(1001);
  expect(fn1).toHaveBeenCalledTimes(1);
  expect(done1).toBeInstanceOf(Function);

  vi.advanceTimersByTime(1001);
  expect(fn1).toHaveBeenCalledTimes(1);

  done1();

  vi.advanceTimersByTime(500);
  expect(fn1).toHaveBeenCalledTimes(1);
  vi.advanceTimersByTime(501);
  expect(fn1).toHaveBeenCalledTimes(1);

  sub2.unsubscribe();

  vi.advanceTimersByTime(500);
  expect(fn1).toHaveBeenCalledTimes(1);
  vi.advanceTimersByTime(501);
  expect(fn1).toHaveBeenCalledTimes(2);
});

test('calling done() twice is ignored', () => {
  const { loop$, start } = createAutoRefreshLoop();

  let done1!: AutoRefreshDoneFn;
  const fn1 = vi.fn((_done) => {
    done1 = _done;
  });
  loop$.subscribe(fn1);

  const fn2 = vi.fn();
  loop$.subscribe(fn2);

  start(1000);

  vi.advanceTimersByTime(1001);
  expect(fn1).toHaveBeenCalledTimes(1);
  expect(done1).toBeInstanceOf(Function);

  vi.advanceTimersByTime(1001);
  expect(fn1).toHaveBeenCalledTimes(1);

  done1();

  vi.advanceTimersByTime(500);
  expect(fn1).toHaveBeenCalledTimes(1);
  vi.advanceTimersByTime(501);
  expect(fn1).toHaveBeenCalledTimes(1);

  done1();

  vi.advanceTimersByTime(500);
  expect(fn1).toHaveBeenCalledTimes(1);
  vi.advanceTimersByTime(501);
  expect(fn1).toHaveBeenCalledTimes(1);
});

test('calling older done() is ignored', () => {
  const { loop$, start } = createAutoRefreshLoop();

  let done1!: AutoRefreshDoneFn;
  const fn1 = vi.fn((_done) => {
    // @ts-ignore
    if (done1) return;
    done1 = _done;
  });
  loop$.subscribe(fn1);

  start(1000);

  vi.advanceTimersByTime(1001);
  expect(fn1).toHaveBeenCalledTimes(1);
  expect(done1).toBeInstanceOf(Function);

  vi.advanceTimersByTime(1001);
  expect(fn1).toHaveBeenCalledTimes(1);

  done1();

  vi.advanceTimersByTime(500);
  expect(fn1).toHaveBeenCalledTimes(1);
  vi.advanceTimersByTime(501);
  expect(fn1).toHaveBeenCalledTimes(2);

  done1();

  vi.advanceTimersByTime(500);
  expect(fn1).toHaveBeenCalledTimes(2);
  vi.advanceTimersByTime(501);
  expect(fn1).toHaveBeenCalledTimes(2);
});

test('pauses if page is not visible', () => {
  let mockPageVisibility: DocumentVisibilityState = 'visible';
  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => mockPageVisibility);

  const { loop$, start, stop } = createAutoRefreshLoop();

  const fn = vi.fn((done) => done());
  loop$.subscribe(fn);

  vi.advanceTimersByTime(5000);
  expect(fn).not.toHaveBeenCalled();

  start(1000);

  vi.advanceTimersByTime(1001);
  expect(fn).toHaveBeenCalledTimes(1);

  mockPageVisibility = 'hidden';
  document.dispatchEvent(new Event('visibilitychange'));

  vi.advanceTimersByTime(1001);
  expect(fn).toHaveBeenCalledTimes(1);

  mockPageVisibility = 'visible';
  document.dispatchEvent(new Event('visibilitychange'));
  expect(fn).toHaveBeenCalledTimes(2);

  vi.advanceTimersByTime(1001);
  expect(fn).toHaveBeenCalledTimes(3);

  stop();

  vi.advanceTimersByTime(5000);
  expect(fn).toHaveBeenCalledTimes(3);
});
