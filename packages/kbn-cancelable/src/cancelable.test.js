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

import { cancelable } from './cancelable';

describe('cancelable', () => {
  test('runs functions in sequence, passing results through', async () => {
    const result = await cancelable(
      () => Promise.resolve('Howdy'),
      msg => Promise.resolve(msg + '!!!')
    );

    expect(result).toEqual('Howdy!!!');
  });

  test('exits if a promise rejects', async () => {
    let called = false;

    expect(cancelable(() => Promise.reject('DOH!'), async () => (called = true))).rejects.toThrow(
      /DOH/
    );

    expect(called).toBeFalsy();
  });

  test('runs exits if canceled', async () => {
    try {
      const promise = cancelable(
        () => Promise.resolve(1),
        () => Promise.resolve(2),
        () => Promise.resolve(3)
      );
      await promise.cancel();
      const result = await promise;
      throw new Error(`SHOULD HAVE REJECTED, but resolved to ${JSON.stringify(result)}`);
    } catch (err) {
      expect(err.message).toMatch(/Promise cancelled/);
      expect(err.status).toEqual('cancelled');
      expect(err.runCount).toBeLessThan(3);
    }
  });

  test('canceling after completion is not a problem', async () => {
    const promise = cancelable(() => Promise.resolve(42));
    expect(await promise).toEqual(42);
    expect(promise.cancel()).resolves.toBeUndefined();
  });
});
