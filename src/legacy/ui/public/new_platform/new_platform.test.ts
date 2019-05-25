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

import {
  __newPlatformSetup__,
  __newPlatformStart__,
  __reset__,
  onSetup,
  onStart,
} from './new_platform';

describe('onSetup', () => {
  afterEach(() => __reset__());

  it('resolves callbacks registered before setup', async () => {
    const aCallback = jest.fn(() => 1);
    const bCallback = jest.fn(() => 2);
    const a = onSetup(aCallback);
    const b = onSetup(bCallback);
    const coreSetup = { fake: true } as any;

    __newPlatformSetup__(coreSetup);

    expect(await Promise.all([a, b])).toEqual([1, 2]);
    expect(aCallback).toHaveBeenCalledWith({ core: { fake: true }, plugins: {} });
    expect(bCallback).toHaveBeenCalledWith({ core: { fake: true }, plugins: {} });
  });

  it('resolves callbacks registered after setup', async () => {
    const callback = jest.fn(() => 3);
    const coreSetup = { fake: true } as any;

    __newPlatformSetup__(coreSetup);

    expect(await onSetup(callback)).toEqual(3);
    expect(callback).toHaveBeenCalledWith({ core: { fake: true }, plugins: {} });
  });

  it('rejects errors in callbacks registered before setup', async () => {
    const aCallback = jest.fn(() => {
      throw new Error('a error!');
    });
    const bCallback = jest.fn(() => {
      throw new Error('b error!');
    });
    const cCallback = jest.fn(() => 3);
    const a = onSetup(aCallback);
    const b = onSetup(bCallback);
    const c = onSetup(cCallback);
    const coreSetup = { fake: true } as any;

    __newPlatformSetup__(coreSetup);

    await expect(a).rejects.toThrowError('a error!');
    await expect(b).rejects.toThrowError('b error!');
    // make sure one exception doesn't stop other callbacks from running
    await expect(c).resolves.toEqual(3);
  });

  it('rejects errors in callbacks registered after setup', async () => {
    const callback = jest.fn(() => {
      throw new Error('a error!');
    });
    const coreSetup = { fake: true } as any;

    __newPlatformSetup__(coreSetup);

    await expect(onSetup(callback)).rejects.toThrowError('a error!');
  });
});

describe('onStart', () => {
  afterEach(() => __reset__());

  it('resolves callbacks registered before start', async () => {
    const aCallback = jest.fn(() => 1);
    const bCallback = jest.fn(() => 2);
    const a = onStart(aCallback);
    const b = onStart(bCallback);
    const coreStart = { fake: true } as any;

    __newPlatformStart__(coreStart);

    expect(await Promise.all([a, b])).toEqual([1, 2]);
    expect(aCallback).toHaveBeenCalledWith({ core: { fake: true }, plugins: {} });
    expect(bCallback).toHaveBeenCalledWith({ core: { fake: true }, plugins: {} });
  });

  it('resolves callbacks registered after start', async () => {
    const callback = jest.fn(() => 3);
    const coreStart = { fake: true } as any;

    __newPlatformStart__(coreStart);

    expect(await onStart(callback)).toEqual(3);
    expect(callback).toHaveBeenCalledWith({ core: { fake: true }, plugins: {} });
  });

  it('rejects errors in callbacks registered before start', async () => {
    const aCallback = jest.fn(() => {
      throw new Error('a error!');
    });
    const bCallback = jest.fn(() => {
      throw new Error('b error!');
    });
    const cCallback = jest.fn(() => 3);
    const a = onStart(aCallback);
    const b = onStart(bCallback);
    const c = onStart(cCallback);
    const coreStart = { fake: true } as any;

    __newPlatformStart__(coreStart);

    await expect(a).rejects.toThrowError('a error!');
    await expect(b).rejects.toThrowError('b error!');
    // make sure one exception doesn't stop other callbacks from running
    await expect(c).resolves.toEqual(3);
  });

  it('rejects errors in callbacks registered after start', async () => {
    const callback = jest.fn(() => {
      throw new Error('a error!');
    });
    const coreStart = { fake: true } as any;

    __newPlatformStart__(coreStart);

    await expect(onStart(callback)).rejects.toThrowError('a error!');
  });
});
