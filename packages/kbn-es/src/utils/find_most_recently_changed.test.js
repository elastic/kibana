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

const mockFs = require('mock-fs');
const { findMostRecentlyChanged } = require('./find_most_recently_changed');

beforeEach(() => {
  mockFs({
    '/data': {
      'oldest.yml': mockFs.file({
        content: 'foo',
        ctime: new Date(2018, 2, 1),
      }),
      'newest.yml': mockFs.file({
        content: 'bar',
        ctime: new Date(2018, 2, 3),
      }),
      'middle.yml': mockFs.file({
        content: 'baz',
        ctime: new Date(2018, 2, 2),
      }),
    },
  });
});

afterEach(() => {
  mockFs.restore();
});

test('returns newest file', () => {
  const file = findMostRecentlyChanged('/data/*.yml');
  expect(file).toEqual('/data/newest.yml');
});
