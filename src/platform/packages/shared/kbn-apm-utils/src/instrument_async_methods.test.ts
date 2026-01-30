/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable max-classes-per-file */

import { instrumentAsyncMethods } from './instrument_async_methods';
import { withSpan } from './with_span';

const withSpanMock = withSpan as jest.MockedFunction<typeof withSpan>;

jest.mock('./with_span', () => ({
  withSpan: jest.fn((options, cb) => cb()),
}));

describe('instrumentAsyncMethods', () => {
  beforeEach(() => {
    withSpanMock.mockClear();
  });

  it('wraps async prototype methods discovered via an instance', async () => {
    class Example {
      value = 'initial';

      async doWork(update: string) {
        this.value = update;
        return `${update}-result`;
      }
    }

    const instance = new Example();
    const originalMethod = Object.getPrototypeOf(instance).doWork;

    instrumentAsyncMethods('Example', instance);

    const result = await instance.doWork('updated');

    expect(result).toBe('updated-result');
    expect(instance.value).toBe('updated');
    expect(withSpanMock).toHaveBeenCalledTimes(1);
    expect(withSpanMock.mock.calls[0][0]).toEqual({ name: 'Example.doWork' });
    const wrappedMethod = Object.getPrototypeOf(instance).doWork;
    expect(wrappedMethod).not.toBe(originalMethod);
  });

  it('wraps async instance field methods', async () => {
    class Example {
      value = 0;

      doWork = async (by: number) => {
        this.value += by;
        return this.value;
      };
    }

    const instance = new Example();
    const originalMethod = instance.doWork;

    instrumentAsyncMethods('Example', instance);

    const result = await instance.doWork(1);

    expect(result).toBe(1);
    expect(instance.value).toBe(1);
    expect(withSpanMock).toHaveBeenCalledTimes(1);
    expect(withSpanMock.mock.calls[0][0]).toEqual({ name: 'Example.doWork' });
    expect(instance.doWork).not.toBe(originalMethod);
  });

  it('wraps async functions defined on plain objects', async () => {
    const service = {
      value: 0,
      async increment(by: number) {
        this.value += by;
        return this.value;
      },
      sync() {
        this.value += 100;
      },
    };

    const originalIncrement = service.increment;

    instrumentAsyncMethods('Service', service);

    const result = await service.increment(2);

    expect(result).toBe(2);
    expect(service.value).toBe(2);
    expect(withSpanMock).toHaveBeenCalledTimes(1);
    expect(withSpanMock.mock.calls[0][0]).toEqual({ name: 'Service.increment' });
    expect(service.increment).not.toBe(originalIncrement);
    expect(Object.prototype.propertyIsEnumerable.call(service, 'increment')).toBe(true);
    // ensure non-async methods are untouched
    const syncBefore = service.sync;
    service.sync();
    expect(service.sync).toBe(syncBefore);
    expect(service.value).toBe(102);
  });

  it('does not wrap when provided a class constructor', async () => {
    class Example {
      async doWork() {
        return 'done';
      }
    }

    const instance = new Example();
    const originalMethod = Object.getPrototypeOf(instance).doWork;

    instrumentAsyncMethods('Example', Example as unknown as object);

    await instance.doWork();

    expect(withSpanMock).not.toHaveBeenCalled();
    expect(Object.getPrototypeOf(instance).doWork).toBe(originalMethod);
  });
});
