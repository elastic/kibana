/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AbortError, abortSignalToPromise } from './abort_utils';

jest.useFakeTimers({ legacyFakeTimers: true });

const flushPromises = () =>
  new Promise((resolve) => jest.requireActual('timers').setImmediate(resolve));

describe('AbortUtils', () => {
  describe('AbortError', () => {
    test('should preserve `message`', () => {
      const message = 'my error message';
      const error = new AbortError(message);
      expect(error.message).toBe(message);
    });

    test('should have a name of "AbortError"', () => {
      const error = new AbortError();
      expect(error.name).toBe('AbortError');
    });
  });

  describe('abortSignalToPromise', () => {
    describe('rejects', () => {
      test('should not reject if the signal does not abort', async () => {
        const controller = new AbortController();
        const promise = abortSignalToPromise(controller.signal).promise;
        const whenRejected = jest.fn();
        promise.catch(whenRejected);
        await flushPromises();
        expect(whenRejected).not.toBeCalled();
      });

      test('should reject if the signal does abort', async () => {
        const controller = new AbortController();
        const promise = abortSignalToPromise(controller.signal).promise;
        const whenRejected = jest.fn();
        promise.catch(whenRejected);
        controller.abort();
        await flushPromises();
        expect(whenRejected).toBeCalled();
        expect(whenRejected.mock.calls[0][0]).toBeInstanceOf(AbortError);
      });

      test('should expose cleanup handler', () => {
        const controller = new AbortController();
        const promise = abortSignalToPromise(controller.signal);
        expect(promise.cleanup).toBeDefined();
      });

      test('calling clean up handler prevents rejects', async () => {
        const controller = new AbortController();
        const { promise, cleanup } = abortSignalToPromise(controller.signal);
        const whenRejected = jest.fn();
        promise.catch(whenRejected);
        cleanup();
        controller.abort();
        await flushPromises();
        expect(whenRejected).not.toBeCalled();
      });
    });
  });
});
