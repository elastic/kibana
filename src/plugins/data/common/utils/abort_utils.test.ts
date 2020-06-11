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

import { AbortError, toPromise, getCombinedSignal } from './abort_utils';

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

  describe('toPromise', () => {
    describe('resolves', () => {
      test('should not resolve if the signal does not abort', async () => {
        const controller = new AbortController();
        const promise = toPromise(controller.signal);
        const whenResolved = jest.fn();
        promise.then(whenResolved);
        await flushPromises();
        expect(whenResolved).not.toBeCalled();
      });

      test('should resolve if the signal does abort', async () => {
        const controller = new AbortController();
        const promise = toPromise(controller.signal);
        const whenResolved = jest.fn();
        promise.then(whenResolved);
        controller.abort();
        await flushPromises();
        expect(whenResolved).toBeCalled();
      });
    });

    describe('rejects', () => {
      test('should not reject if the signal does not abort', async () => {
        const controller = new AbortController();
        const promise = toPromise(controller.signal, true);
        const whenRejected = jest.fn();
        promise.catch(whenRejected);
        await flushPromises();
        expect(whenRejected).not.toBeCalled();
      });

      test('should reject if the signal does abort', async () => {
        const controller = new AbortController();
        const promise = toPromise(controller.signal, true);
        const whenRejected = jest.fn();
        promise.catch(whenRejected);
        controller.abort();
        await flushPromises();
        expect(whenRejected).toBeCalled();
      });
    });
  });

  describe('getCombinedSignal', () => {
    test('should return an AbortSignal', () => {
      const signal = getCombinedSignal([]);
      expect(signal instanceof AbortSignal).toBe(true);
    });

    test('should not abort if none of the signals abort', async () => {
      const controller1 = new AbortController();
      const controller2 = new AbortController();
      setTimeout(() => controller1.abort(), 2000);
      setTimeout(() => controller2.abort(), 1000);
      const signal = getCombinedSignal([controller1.signal, controller2.signal]);
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
      const signal = getCombinedSignal([controller1.signal, controller2.signal]);
      expect(signal.aborted).toBe(false);
      jest.advanceTimersByTime(1000);
      await flushPromises();
      expect(signal.aborted).toBe(true);
    });
  });
});
