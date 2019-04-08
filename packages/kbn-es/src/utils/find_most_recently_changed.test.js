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

jest.mock('fs', () => ({
  statSync: jest.fn().mockImplementation(path => {
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

const { findMostRecentlyChanged } = require('./find_most_recently_changed');

test('returns newest file', () => {
  const file = findMostRecentlyChanged('/data/*.yml');
  expect(file).toEqual('/data/newest.yml');
});

afterAll(() => {
  jest.restoreAllMocks();
});
