/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { Capabilities } from '@kbn/core-capabilities-common';
import type { CapabilitiesSwitcher } from '@kbn/core-capabilities-server';
import { pathsIntersect, splitIntoBuckets, convertBucketToSwitcher } from './resolve_helpers';
import type { SwitcherWithId, SwitcherBucket } from './types';

describe('pathsIntersect', () => {
  test.each([
    ['*', '*', true],
    ['foo', 'foo', true],
    ['foo.*', '*', true],
    ['bar', '*', true],
    ['foo.bar', '*', true],
    ['foo.bar', 'foo.*', true],
    ['foo.bar', 'foo.bar', true],
    ['foo', 'bar', false],
    ['foo.*', 'bar.*', false],
    ['foo.bar', 'bar.*', false],
    ['common.foo', 'common.bar', false],
    ['common.foo.*', 'common.bar.*', false],
  ])('%p and %p returns %p', (pathA, pathB, expected) => {
    expect(pathsIntersect(pathA, pathB)).toBe(expected);
    expect(pathsIntersect(pathB, pathA)).toBe(expected);
  });
});

describe('splitIntoBuckets', () => {
  const extractIds = (buckets: SwitcherBucket[]): string[][] => {
    return buckets.map((bucket) => bucket.switchers.map((switcher) => switcher.id));
  };

  const switcherWithId = (id: string, paths: string | string[]): SwitcherWithId => {
    return {
      id,
      capabilityPath: Array.isArray(paths) ? paths : [paths],
      switcher: jest.fn(),
    };
  };

  it('properly dispatch the switchers, simple case', () => {
    const switchers = [
      switcherWithId('1', ['*']),
      switcherWithId('2', ['foo.*']),
      switcherWithId('3', ['*']),
      switcherWithId('4', ['bar.*']),
    ];

    const result = splitIntoBuckets(switchers);
    expect(extractIds(result)).toEqual([['1'], ['2', '4'], ['3']]);
  });

  it('properly dispatch the switchers, more advanced case', () => {
    const switchers = [
      switcherWithId('1', ['*']),
      switcherWithId('2', ['foo.*']),
      switcherWithId('3', ['foo.hello.*']),
      switcherWithId('4', ['bar.*']),
      switcherWithId('5', ['*']),
      switcherWithId('6', ['bar.*']),
    ];

    const result = splitIntoBuckets(switchers);
    expect(extractIds(result)).toEqual([['1'], ['2', '4'], ['3', '6'], ['5']]);
  });
});

describe('convertBucketToSwitcher', () => {
  const switcherFromFn = (fn: CapabilitiesSwitcher): SwitcherWithId => {
    return {
      id: '42',
      capabilityPath: ['*'],
      switcher: fn,
    };
  };

  test('the underlying switchers are all called', async () => {
    const switcher1 = jest.fn();
    const switcher2 = jest.fn();
    const switcher3 = jest.fn();

    const bucket: SwitcherBucket = {
      bucketPaths: new Set(['*']),
      switchers: [switcherFromFn(switcher1), switcherFromFn(switcher2), switcherFromFn(switcher3)],
    };

    const switcher = convertBucketToSwitcher(bucket);

    const request = httpServerMock.createKibanaRequest();
    await switcher(request, {} as Capabilities, false);

    expect(switcher1).toHaveBeenCalledTimes(1);
    expect(switcher2).toHaveBeenCalledTimes(1);
    expect(switcher3).toHaveBeenCalledTimes(1);
  });

  test('the underlying switchers are called with the correct arguments', async () => {
    const switcher1 = jest.fn();
    const switcher2 = jest.fn();
    const switcher3 = jest.fn();

    const bucket: SwitcherBucket = {
      bucketPaths: new Set(['*']),
      switchers: [switcherFromFn(switcher1), switcherFromFn(switcher2), switcherFromFn(switcher3)],
    };

    const switcher = convertBucketToSwitcher(bucket);

    const request = httpServerMock.createKibanaRequest();
    const capabilities = { navLinks: { bar: false } } as unknown as Capabilities;
    await switcher(request, capabilities, false);

    expect(switcher1).toHaveBeenCalledWith(request, capabilities, false);
    expect(switcher2).toHaveBeenCalledWith(request, capabilities, false);
    expect(switcher3).toHaveBeenCalledWith(request, capabilities, false);
  });

  test('returns the aggregated result from all the underlying switchers', async () => {
    const switcher1 = jest.fn().mockResolvedValue({ foo: { bar: 1 } });
    const switcher2 = jest.fn().mockResolvedValue({ bar: { hello: 2 } });
    const switcher3 = jest.fn().mockResolvedValue({ hello: { dolly: 3 } });

    const bucket: SwitcherBucket = {
      bucketPaths: new Set(['*']),
      switchers: [switcherFromFn(switcher1), switcherFromFn(switcher2), switcherFromFn(switcher3)],
    };

    const switcher = convertBucketToSwitcher(bucket);

    const request = httpServerMock.createKibanaRequest();
    const capabilities = { navLinks: { bar: false } } as unknown as Capabilities;
    const changes = await switcher(request, capabilities, false);

    expect(changes).toEqual({
      foo: { bar: 1 },
      bar: { hello: 2 },
      hello: { dolly: 3 },
    });
  });

  test('result aggregation works even for non-intersecting nested values', async () => {
    const switcher1 = jest.fn().mockResolvedValue({ nested: { foo: 1 } });
    const switcher2 = jest.fn().mockResolvedValue({ nested: { bar: 2 } });
    const switcher3 = jest.fn().mockResolvedValue({ nested: { dolly: 3 } });

    const bucket: SwitcherBucket = {
      bucketPaths: new Set(['*']),
      switchers: [switcherFromFn(switcher1), switcherFromFn(switcher2), switcherFromFn(switcher3)],
    };

    const switcher = convertBucketToSwitcher(bucket);

    const request = httpServerMock.createKibanaRequest();
    const capabilities = { navLinks: { bar: false } } as unknown as Capabilities;
    const changes = await switcher(request, capabilities, false);

    expect(changes).toEqual({
      nested: {
        foo: 1,
        bar: 2,
        dolly: 3,
      },
    });
  });
});
