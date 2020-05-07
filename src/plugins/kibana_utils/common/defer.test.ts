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

import { Defer } from './defer';

const tick = () => new Promise(resolve => setTimeout(resolve, 1));

describe('new Defer()', () => {
  test('has .promise Promise object', () => {
    expect(new Defer().promise).toBeInstanceOf(Promise);
  });

  test('has .resolve() method', () => {
    expect(typeof new Defer().resolve).toBe('function');
  });

  test('has .reject() method', () => {
    expect(typeof new Defer().reject).toBe('function');
  });

  test('resolves promise when .reject() is called', async () => {
    const defer = new Defer<number>();
    const then = jest.fn();
    defer.promise.then(then);

    await tick();
    expect(then).toHaveBeenCalledTimes(0);

    defer.resolve(123);

    await tick();
    expect(then).toHaveBeenCalledTimes(1);
    expect(then).toHaveBeenCalledWith(123);
  });

  test('rejects promise when .reject() is called', async () => {
    const defer = new Defer<number>();
    const then = jest.fn();
    const spy = jest.fn();
    defer.promise.then(then).catch(spy);

    await tick();
    expect(then).toHaveBeenCalledTimes(0);
    expect(spy).toHaveBeenCalledTimes(0);

    defer.reject('oops');

    await tick();
    expect(then).toHaveBeenCalledTimes(0);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('oops');
  });
});
