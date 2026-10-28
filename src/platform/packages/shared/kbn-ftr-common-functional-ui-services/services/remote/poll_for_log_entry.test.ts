/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { logging, Session, WebDriver } from 'selenium-webdriver';
import { NoSuchSessionError, NoSuchWindowError } from 'selenium-webdriver/lib/error';
import type { Subscription } from 'rxjs';
import { FINAL_LOG_ENTRY_PREFIX, pollForLogEntry$ } from './poll_for_log_entry';

let subscription: Subscription | undefined;
const setup = () => {
  const driver = new WebDriver(Promise.resolve(new Session('log-poll-test', {})), {
    execute: jest.fn(),
  });
  const options = driver.manage();
  const logs = options.logs();
  jest.spyOn(options, 'logs').mockReturnValue(logs);
  jest.spyOn(driver, 'manage').mockReturnValue(options);
  let requests = 0;
  const get = jest.spyOn(logs, 'get').mockImplementation(async () => {
    if (++requests > 100) throw new NoSuchSessionError('Runaway log polling');
    return [];
  });
  const entries: logging.Entry[] = [];
  const complete = jest.fn();
  const start = () => {
    subscription = pollForLogEntry$(driver, logging.Type.BROWSER, 100).subscribe({
      next: (entry) => entries.push(entry),
      complete,
    });
  };
  return { get, entries, complete, start };
};

beforeEach(() => jest.useFakeTimers());
afterEach(() => {
  subscription?.unsubscribe();
  subscription = undefined;
  jest.useRealTimers();
});

it('spaces empty-log requests by the configured interval and stops on unsubscribe', async () => {
  const { get, start } = setup();
  start();
  await jest.advanceTimersByTimeAsync(0);
  expect(get).toHaveBeenCalledTimes(1);
  await jest.advanceTimersByTimeAsync(99);
  expect(get).toHaveBeenCalledTimes(1);
  await jest.advanceTimersByTimeAsync(1);
  expect(get).toHaveBeenCalledTimes(2);
  await jest.advanceTimersByTimeAsync(500);
  expect(get).toHaveBeenCalledTimes(7);
  subscription?.unsubscribe();
  await jest.advanceTimersByTimeAsync(500);
  expect(get).toHaveBeenCalledTimes(7);
});

it('delivers batches immediately and keeps polling when every entry is filtered out', async () => {
  const { get, entries, start } = setup();
  const message = new logging.Entry('INFO', 'Ready');
  get.mockResolvedValueOnce([message]);
  get.mockResolvedValueOnce([new logging.Entry('INFO', 'Download the React DevTools')]);
  start();
  await jest.advanceTimersByTimeAsync(0);
  expect(entries).toEqual([message]);
  expect(get).toHaveBeenCalledTimes(1);
  await jest.advanceTimersByTimeAsync(200);
  expect(get).toHaveBeenCalledTimes(3);
});

it('waits for an in-flight request to finish before starting its polling delay', async () => {
  const { get, start } = setup();
  get.mockImplementationOnce(() => new Promise((resolve) => setTimeout(() => resolve([]), 250)));
  start();
  await jest.advanceTimersByTimeAsync(349);
  expect(get).toHaveBeenCalledTimes(1);
  await jest.advanceTimersByTimeAsync(1);
  expect(get).toHaveBeenCalledTimes(2);
});

it('retains the ten-second recovery delay after a transient request error', async () => {
  const { get, entries, start } = setup();
  get.mockRejectedValueOnce(new Error('Temporary transport failure'));
  start();
  await jest.advanceTimersByTimeAsync(9999);
  expect(get).toHaveBeenCalledTimes(1);
  expect(entries[0].message).toContain('Temporary transport failure');
  await jest.advanceTimersByTimeAsync(1);
  expect(get).toHaveBeenCalledTimes(2);
  await jest.advanceTimersByTimeAsync(100);
  expect(get).toHaveBeenCalledTimes(3);
});

it.each([NoSuchSessionError, NoSuchWindowError])('stops polling after %p', async (Failure) => {
  const { get, entries, complete, start } = setup();
  get.mockRejectedValueOnce(new Failure('Browser closed'));
  start();
  await jest.advanceTimersByTimeAsync(10000);
  expect(get).toHaveBeenCalledTimes(1);
  expect(entries[0].message).toContain(FINAL_LOG_ENTRY_PREFIX);
  expect(complete).toHaveBeenCalledTimes(1);
});
