/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { NowProvider, NowProviderInternalContract } from './now_provider';

let mockDateFromUrl: undefined | Date;
let nowProvider: NowProviderInternalContract;

jest.mock('./lib', () => ({
  // @ts-ignore
  ...jest.requireActual('./lib'),
  getForceNowFromUrl: () => mockDateFromUrl,
}));

beforeEach(() => {
  nowProvider = new NowProvider();
});
afterEach(() => {
  mockDateFromUrl = undefined;
});

test('should return Date.now() by default', async () => {
  const now = Date.now();
  await new Promise((r) => setTimeout(r, 10));
  expect(nowProvider.get().getTime()).toBeGreaterThan(now);
});

test('should forceNow from URL', async () => {
  mockDateFromUrl = new Date('1999-01-01T00:00:00.000Z');
  nowProvider = new NowProvider();
  expect(nowProvider.get()).toEqual(mockDateFromUrl);
});

test('should forceNow from URL if custom now is set', async () => {
  mockDateFromUrl = new Date('1999-01-01T00:00:00.000Z');
  nowProvider = new NowProvider();
  nowProvider.set(new Date());
  expect(nowProvider.get()).toEqual(mockDateFromUrl);
});
