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

import { getNonUniqueEntries } from './get_non_unique_entries';

const foo1 = { type: 'foo', id: '1' };
const foo2 = { type: 'foo', id: '2' }; // same type as foo1, different ID
const bar1 = { type: 'bar', id: '1' }; // same ID as foo1, different type

describe('#getNonUniqueEntries', () => {
  test('returns empty array if entries are unique', () => {
    const result = getNonUniqueEntries([foo1, foo2, bar1]);
    expect(result).toEqual([]);
  });

  test('returns non-empty array for non-unique results', () => {
    const result1 = getNonUniqueEntries([foo1, foo2, foo1]);
    const result2 = getNonUniqueEntries([foo1, foo2, foo1, foo2]);
    expect(result1).toEqual([`${foo1.type}:${foo1.id}`]);
    expect(result2).toEqual([`${foo1.type}:${foo1.id}`, `${foo2.type}:${foo2.id}`]);
  });
});
