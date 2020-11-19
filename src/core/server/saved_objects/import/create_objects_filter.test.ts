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

import { createObjectsFilter } from './create_objects_filter';

describe('createObjectsFilter()', () => {
  test('filter should return false when contains empty parameters', () => {
    const fn = createObjectsFilter([]);
    expect(fn({ type: 'a', id: '1', attributes: {}, references: [] })).toEqual(false);
  });

  test('filter should return true for objects that are being retried', () => {
    const fn = createObjectsFilter([
      {
        type: 'a',
        id: '1',
        overwrite: false,
        replaceReferences: [],
      },
    ]);
    expect(
      fn({
        type: 'a',
        id: '1',
        attributes: {},
        references: [],
      })
    ).toEqual(true);
  });

  test(`filter should return false for objects that aren't being retried`, () => {
    const fn = createObjectsFilter([
      {
        type: 'a',
        id: '1',
        overwrite: false,
        replaceReferences: [],
      },
    ]);
    expect(
      fn({
        type: 'b',
        id: '1',
        attributes: {},
        references: [],
      })
    ).toEqual(false);
    expect(
      fn({
        type: 'a',
        id: '2',
        attributes: {},
        references: [],
      })
    ).toEqual(false);
  });
});
