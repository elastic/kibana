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

import { AbortError, abortSignalToPromise, getCombinedAbortSignal } from './abort_utils';

jest.useFakeTimers();

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

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

  describe('getCombinedAbortSignal', () => {
    test('should return an AbortSignal', () => {
      const signal = getCombinedAbortSignal([]).signal;
      expect(signal).toBeInstanceOf(AbortSignal);
    });

    test('should not abort if none of the signals abort', async () => {
      const controller1 = new AbortController();
      const controller2 = new AbortController();
      setTimeout(() => controller1.abort(), 2000);
      setTimeout(() => controller2.abort(), 1000);
      const signal = getCombinedAbortSignal([controller1.signal, controller2.signal]).signal;
      expect(signal.aborted).toBe(false);
      jest.advanceTimersByTime(500);
      await flushPromises();
      expect(signal.aborted).toBe(false);
    });

    test('should abort when the first signal aborts', async () => {
      const controller1 = new AbortController();
      const controller2 = new AbortController();
      setTimeout(() => controller1.abort(), 2000);
      setTimeout(() => controller2.abort(), 1000);
      const signal = getCombinedAbortSignal([controller1.signal, controller2.signal]).signal;
      expect(signal.aborted).toBe(false);
      jest.advanceTimersByTime(1000);
      await flushPromises();
      expect(signal.aborted).toBe(true);
    });

    test('should be aborted if any of the signals is already aborted', async () => {
      const controller1 = new AbortController();
      const controller2 = new AbortController();
      controller1.abort();
      const signal = getCombinedAbortSignal([controller1.signal, controller2.signal]).signal;
      expect(signal.aborted).toBe(true);
    });

    describe('cleanup listener', () => {
      const createMockController = () => {
        const controller = new AbortController();
        const spyAddListener = jest.spyOn(controller.signal, 'addEventListener');
        const spyRemoveListener = jest.spyOn(controller.signal, 'removeEventListener');
        return {
          controller,
          getTotalListeners: () =>
            Math.max(spyAddListener.mock.calls.length - spyRemoveListener.mock.calls.length, 0),
        };
      };

      test('cleanup should cleanup inner listeners', () => {
        const controller1 = createMockController();
        const controller2 = createMockController();

        const { cleanup } = getCombinedAbortSignal([
          controller1.controller.signal,
          controller2.controller.signal,
        ]);

        expect(controller1.getTotalListeners()).toBe(1);
        expect(controller2.getTotalListeners()).toBe(1);

        cleanup();

        expect(controller1.getTotalListeners()).toBe(0);
        expect(controller2.getTotalListeners()).toBe(0);
      });

      test('abort should cleanup inner listeners', async () => {
        const controller1 = createMockController();
        const controller2 = createMockController();

        getCombinedAbortSignal([controller1.controller.signal, controller2.controller.signal]);

        expect(controller1.getTotalListeners()).toBe(1);
        expect(controller2.getTotalListeners()).toBe(1);

        controller1.controller.abort();

        await flushPromises();

        expect(controller1.getTotalListeners()).toBe(0);
        expect(controller2.getTotalListeners()).toBe(0);
      });
    });
  });
});
