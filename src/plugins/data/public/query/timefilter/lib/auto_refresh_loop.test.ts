/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createAutoRefreshLoop, AutoRefreshDoneFn } from './auto_refresh_loop';

jest.useFakeTimers({ legacyFakeTimers: true });

test('triggers refresh with interval', () => {
  const { loop$, start, stop } = createAutoRefreshLoop();

  const fn = jest.fn((done) => done());
  loop$.subscribe(fn);

  jest.advanceTimersByTime(5000);
  expect(fn).not.toBeCalled();

  start(1000);

  jest.advanceTimersByTime(1001);
  expect(fn).toHaveBeenCalledTimes(1);

  jest.advanceTimersByTime(1001);
  expect(fn).toHaveBeenCalledTimes(2);

  stop();

  jest.advanceTimersByTime(5000);
  expect(fn).toHaveBeenCalledTimes(2);
});

test('waits for done() to be called', () => {
  const { loop$, start } = createAutoRefreshLoop();

  let done!: AutoRefreshDoneFn;
  const fn = jest.fn((_done) => {
    done = _done;
  });
  loop$.subscribe(fn);
  start(1000);

  jest.advanceTimersByTime(1001);
  expect(fn).toHaveBeenCalledTimes(1);
  expect(done).toBeInstanceOf(Function);

  jest.advanceTimersByTime(1001);
  expect(fn).toHaveBeenCalledTimes(1);

  done();

  jest.advanceTimersByTime(500);
  expect(fn).toHaveBeenCalledTimes(1);
  jest.advanceTimersByTime(501);
  expect(fn).toHaveBeenCalledTimes(2);
});

test('waits for done() from multiple subscribers to be called', () => {
  const { loop$, start } = createAutoRefreshLoop();

  let done1!: AutoRefreshDoneFn;
  const fn1 = jest.fn((_done) => {
    done1 = _done;
  });
  loop$.subscribe(fn1);

  let done2!: AutoRefreshDoneFn;
  const fn2 = jest.fn((_done) => {
    done2 = _done;
  });
  loop$.subscribe(fn2);

  start(1000);

  jest.advanceTimersByTime(1001);
  expect(fn1).toHaveBeenCalledTimes(1);
  expect(done1).toBeInstanceOf(Function);

  jest.advanceTimersByTime(1001);
  expect(fn1).toHaveBeenCalledTimes(1);

  done1();

  jest.advanceTimersByTime(500);
  expect(fn1).toHaveBeenCalledTimes(1);
  jest.advanceTimersByTime(501);
  expect(fn1).toHaveBeenCalledTimes(1);

  done2();

  jest.advanceTimersByTime(500);
  expect(fn1).toHaveBeenCalledTimes(1);
  jest.advanceTimersByTime(501);
  expect(fn1).toHaveBeenCalledTimes(2);
});

test('unsubscribe() resets the state', () => {
  const { loop$, start } = createAutoRefreshLoop();

  let done1!: AutoRefreshDoneFn;
  const fn1 = jest.fn((_done) => {
    done1 = _done;
  });
  loop$.subscribe(fn1);

  const fn2 = jest.fn();
  const sub2 = loop$.subscribe(fn2);

  start(1000);

  jest.advanceTimersByTime(1001);
  expect(fn1).toHaveBeenCalledTimes(1);
  expect(done1).toBeInstanceOf(Function);

  jest.advanceTimersByTime(1001);
  expect(fn1).toHaveBeenCalledTimes(1);

  done1();

  jest.advanceTimersByTime(500);
  expect(fn1).toHaveBeenCalledTimes(1);
  jest.advanceTimersByTime(501);
  expect(fn1).toHaveBeenCalledTimes(1);

  sub2.unsubscribe();

  jest.advanceTimersByTime(500);
  expect(fn1).toHaveBeenCalledTimes(1);
  jest.advanceTimersByTime(501);
  expect(fn1).toHaveBeenCalledTimes(2);
});

test('calling done() twice is ignored', () => {
  const { loop$, start } = createAutoRefreshLoop();

  let done1!: AutoRefreshDoneFn;
  const fn1 = jest.fn((_done) => {
    done1 = _done;
  });
  loop$.subscribe(fn1);

  const fn2 = jest.fn();
  loop$.subscribe(fn2);

  start(1000);

  jest.advanceTimersByTime(1001);
  expect(fn1).toHaveBeenCalledTimes(1);
  expect(done1).toBeInstanceOf(Function);

  jest.advanceTimersByTime(1001);
  expect(fn1).toHaveBeenCalledTimes(1);

  done1();

  jest.advanceTimersByTime(500);
  expect(fn1).toHaveBeenCalledTimes(1);
  jest.advanceTimersByTime(501);
  expect(fn1).toHaveBeenCalledTimes(1);

  done1();

  jest.advanceTimersByTime(500);
  expect(fn1).toHaveBeenCalledTimes(1);
  jest.advanceTimersByTime(501);
  expect(fn1).toHaveBeenCalledTimes(1);
});

test('calling older done() is ignored', () => {
  const { loop$, start } = createAutoRefreshLoop();

  let done1!: AutoRefreshDoneFn;
  const fn1 = jest.fn((_done) => {
    // @ts-ignore
    if (done1) return;
    done1 = _done;
  });
  loop$.subscribe(fn1);

  start(1000);

  jest.advanceTimersByTime(1001);
  expect(fn1).toHaveBeenCalledTimes(1);
  expect(done1).toBeInstanceOf(Function);

  jest.advanceTimersByTime(1001);
  expect(fn1).toHaveBeenCalledTimes(1);

  done1();

  jest.advanceTimersByTime(500);
  expect(fn1).toHaveBeenCalledTimes(1);
  jest.advanceTimersByTime(501);
  expect(fn1).toHaveBeenCalledTimes(2);

  done1();

  jest.advanceTimersByTime(500);
  expect(fn1).toHaveBeenCalledTimes(2);
  jest.advanceTimersByTime(501);
  expect(fn1).toHaveBeenCalledTimes(2);
});

test('pauses if page is not visible', () => {
  let mockPageVisibility: DocumentVisibilityState = 'visible';
  jest.spyOn(document, 'visibilityState', 'get').mockImplementation(() => mockPageVisibility);

  const { loop$, start, stop } = createAutoRefreshLoop();

  const fn = jest.fn((done) => done());
  loop$.subscribe(fn);

  jest.advanceTimersByTime(5000);
  expect(fn).not.toBeCalled();

  start(1000);

  jest.advanceTimersByTime(1001);
  expect(fn).toHaveBeenCalledTimes(1);

  mockPageVisibility = 'hidden';
  document.dispatchEvent(new Event('visibilitychange'));

  jest.advanceTimersByTime(1001);
  expect(fn).toHaveBeenCalledTimes(1);

  mockPageVisibility = 'visible';
  document.dispatchEvent(new Event('visibilitychange'));
  expect(fn).toHaveBeenCalledTimes(2);

  jest.advanceTimersByTime(1001);
  expect(fn).toHaveBeenCalledTimes(3);

  stop();

  jest.advanceTimersByTime(5000);
  expect(fn).toHaveBeenCalledTimes(3);
});
