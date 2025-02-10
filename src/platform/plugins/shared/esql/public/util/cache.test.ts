/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { cacheNonParametrizedAsyncFunction } from './cache';

it('returns the value returned by the original function', async () => {
  const fn = jest.fn().mockResolvedValue('value');
  const cached = cacheNonParametrizedAsyncFunction(fn);
  const value = await cached();

  expect(value).toBe('value');
});

it('immediate consecutive calls do not call the original function', async () => {
  const fn = jest.fn().mockResolvedValue('value');
  const cached = cacheNonParametrizedAsyncFunction(fn);
  const value1 = await cached();

  expect(fn.mock.calls.length).toBe(1);

  const value2 = await cached();

  expect(fn.mock.calls.length).toBe(1);

  const value3 = await cached();

  expect(fn.mock.calls.length).toBe(1);

  expect(value1).toBe('value');
  expect(value2).toBe('value');
  expect(value3).toBe('value');
});

it('immediate consecutive synchronous calls do not call the original function', async () => {
  const fn = jest.fn().mockResolvedValue('value');
  const cached = cacheNonParametrizedAsyncFunction(fn);
  const value1 = cached();
  const value2 = cached();
  const value3 = cached();

  expect(fn.mock.calls.length).toBe(1);
  expect(await value1).toBe('value');
  expect(await value2).toBe('value');
  expect(await value3).toBe('value');
  expect(fn.mock.calls.length).toBe(1);
});

it('does not call original function if cached value is fresh enough', async () => {
  let time = 1;
  let value = 'value1';
  const now = jest.fn(() => time);
  const fn = jest.fn(async () => value);
  const cached = cacheNonParametrizedAsyncFunction(fn, 100, 20, now);

  const value1 = await cached();

  expect(fn.mock.calls.length).toBe(1);
  expect(value1).toBe('value1');

  time = 10;
  value = 'value2';

  const value2 = await cached();

  expect(fn.mock.calls.length).toBe(1);
  expect(value2).toBe('value1');
});

it('immediately returns cached value, but calls original function when sufficient time passed', async () => {
  let time = 1;
  let value = 'value1';
  const now = jest.fn(() => time);
  const fn = jest.fn(async () => value);
  const cached = cacheNonParametrizedAsyncFunction(fn, 100, 20, now);

  const value1 = await cached();

  expect(fn.mock.calls.length).toBe(1);
  expect(value1).toBe('value1');

  time = 30;
  value = 'value2';

  const value2 = await cached();

  expect(fn.mock.calls.length).toBe(2);
  expect(value2).toBe('value1');

  time = 50;
  value = 'value3';

  const value3 = await cached();

  expect(fn.mock.calls.length).toBe(2);
  expect(value3).toBe('value2');
});

it('blocks and refreshes the value when cache expires', async () => {
  let time = 1;
  let value = 'value1';
  const now = jest.fn(() => time);
  const fn = jest.fn(async () => value);
  const cached = cacheNonParametrizedAsyncFunction(fn, 100, 20, now);

  const value1 = await cached();

  expect(fn.mock.calls.length).toBe(1);
  expect(value1).toBe('value1');

  time = 130;
  value = 'value2';

  const value2 = await cached();

  expect(fn.mock.calls.length).toBe(2);
  expect(value2).toBe('value2');
});
