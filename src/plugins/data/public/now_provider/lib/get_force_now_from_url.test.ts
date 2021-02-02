/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { getForceNowFromUrl } from './get_force_now_from_url';
const originalLocation = window.location;
afterAll(() => {
  window.location = originalLocation;
});

function mockLocation(url: string) {
  // @ts-ignore
  delete window.location;
  // @ts-ignore
  window.location = new URL(url);
}

test('should get force now from URL', () => {
  const dateString = '1999-01-01T00:00:00.000Z';
  mockLocation(`https://elastic.co/?forceNow=${dateString}`);

  expect(getForceNowFromUrl()).toEqual(new Date(dateString));
});

test('should throw if force now is invalid', () => {
  const dateString = 'invalid-date';
  mockLocation(`https://elastic.co/?forceNow=${dateString}`);

  expect(() => getForceNowFromUrl()).toThrowError();
});

test('should return undefined if no forceNow', () => {
  mockLocation(`https://elastic.co/`);
  expect(getForceNowFromUrl()).toBe(undefined);
});
