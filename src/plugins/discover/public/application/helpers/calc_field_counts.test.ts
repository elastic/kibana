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

import { calcFieldCounts } from './calc_field_counts';
import { indexPatternMock } from '../../__mocks__/index_pattern';

describe('calcFieldCounts', () => {
  test('returns valid field count data', async () => {
    const rows = [
      { _id: 1, _source: { message: 'test1', bytes: 20 } },
      { _id: 2, _source: { name: 'test2', extension: 'jpg' } },
    ];
    const result = calcFieldCounts({}, rows, indexPatternMock);
    expect(result).toMatchInlineSnapshot(`
      Object {
        "_index": 2,
        "_score": 2,
        "bytes": 1,
        "extension": 1,
        "message": 1,
        "name": 1,
      }
    `);
  });
  test('updates field count data', async () => {
    const rows = [
      { _id: 1, _source: { message: 'test1', bytes: 20 } },
      { _id: 2, _source: { name: 'test2', extension: 'jpg' } },
    ];
    const result = calcFieldCounts({ message: 2 }, rows, indexPatternMock);
    expect(result).toMatchInlineSnapshot(`
      Object {
        "_index": 2,
        "_score": 2,
        "bytes": 1,
        "extension": 1,
        "message": 3,
        "name": 1,
      }
    `);
  });
});
