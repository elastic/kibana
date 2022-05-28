/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { findMostRecentlyChanged } from './find_most_recently_changed';

jest.mock('fs', () => ({
  statSync: jest.fn().mockImplementation((path) => {
    if (path.includes('oldest')) {
      return {
        ctime: new Date(2018, 2, 1),
      };
    }

    if (path.includes('newest')) {
      return {
        ctime: new Date(2018, 2, 3),
      };
    }

    if (path.includes('middle')) {
      return {
        ctime: new Date(2018, 2, 2),
      };
    }
  }),
  readdirSync: jest.fn().mockImplementation(() => {
    return ['oldest.yml', 'newest.yml', 'middle.yml'];
  }),
}));

test('returns newest file', () => {
  const file = findMostRecentlyChanged('/data/*.yml');
  expect(file).toEqual('/data/newest.yml');
});

afterAll(() => {
  jest.restoreAllMocks();
});
