/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { pollSearch } from './poll_search';
import { AbortError } from '@kbn/kibana-utils-plugin/common';

describe('pollSearch', () => {
  function getMockedSearch$(resolveOnI = 1, finishWithError = false) {
    let counter = 0;
    return jest.fn().mockImplementation(() => {
      counter++;
      const lastCall = counter === resolveOnI;
      return new Promise((resolve) => {
        if (lastCall) {
          resolve({
            isRunning: false,
            isPartial: finishWithError,
            rawResponse: {},
          });
        } else {
          resolve({
            isRunning: true,
            isPartial: true,
            rawResponse: {},
          });
        }
      });
    });
  }

  test('Defers execution', async () => {
    const searchFn = getMockedSearch$(1);
    const cancelFn = jest.fn();
    pollSearch(searchFn, cancelFn);
    expect(searchFn).toBeCalledTimes(0);
    expect(cancelFn).toBeCalledTimes(0);
  });

  test('Resolves immediatelly', async () => {
    const searchFn = getMockedSearch$(1);
    const cancelFn = jest.fn();
    await pollSearch(searchFn, cancelFn).toPromise();
    expect(searchFn).toBeCalledTimes(1);
    expect(cancelFn).toBeCalledTimes(0);
  });

  test('Resolves when complete', async () => {
    const searchFn = getMockedSearch$(3);
    const cancelFn = jest.fn();
    await pollSearch(searchFn, cancelFn).toPromise();
    expect(searchFn).toBeCalledTimes(3);
    expect(cancelFn).toBeCalledTimes(0);
  });

  test('Throws Error on ES error response', async () => {
    const searchFn = getMockedSearch$(2, true);
    const cancelFn = jest.fn();
    const poll = pollSearch(searchFn, cancelFn).toPromise();
    await expect(poll).rejects.toThrow(Error);
    expect(searchFn).toBeCalledTimes(2);
    expect(cancelFn).toBeCalledTimes(0);
  });

  test('Throws AbortError on empty response', async () => {
    const searchFn = jest.fn().mockResolvedValue(undefined);
    const cancelFn = jest.fn();
    const poll = pollSearch(searchFn, cancelFn).toPromise();
    await expect(poll).rejects.toThrow(AbortError);
    expect(searchFn).toBeCalledTimes(1);
    expect(cancelFn).toBeCalledTimes(0);
  });

  test('Throws AbortError and cancels on abort', async () => {
    const searchFn = getMockedSearch$(20);
    const cancelFn = jest.fn();
    const abortController = new AbortController();
    const poll = pollSearch(searchFn, cancelFn, {
      abortSignal: abortController.signal,
    }).toPromise();

    await new Promise((resolve) => setTimeout(resolve, 500));
    abortController.abort();

    await expect(poll).rejects.toThrow(AbortError);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    expect(searchFn).toBeCalledTimes(1);
    expect(cancelFn).toBeCalledTimes(1);
  });

  test("Stops, but doesn't cancel on unsubscribe", async () => {
    const searchFn = getMockedSearch$(20);
    const cancelFn = jest.fn();
    const subscription = pollSearch(searchFn, cancelFn).subscribe(() => {});

    await new Promise((resolve) => setTimeout(resolve, 500));
    subscription.unsubscribe();
    await new Promise((resolve) => setTimeout(resolve, 1000));

    expect(searchFn).toBeCalledTimes(1);
    expect(cancelFn).toBeCalledTimes(0);
  });

  test('Calls cancel even when consumer unsubscribes', async () => {
    const searchFn = getMockedSearch$(20);
    const cancelFn = jest.fn();
    const abortController = new AbortController();
    const subscription = pollSearch(searchFn, cancelFn, {
      abortSignal: abortController.signal,
    }).subscribe(() => {});
    subscription.unsubscribe();
    abortController.abort();

    expect(searchFn).toBeCalledTimes(1);
    expect(cancelFn).toBeCalledTimes(1);
  });
});
