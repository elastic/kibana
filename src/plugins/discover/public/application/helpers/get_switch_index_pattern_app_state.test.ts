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

import { getSwitchIndexPatternAppState } from './get_switch_index_pattern_app_state';
import { IIndexPatternFieldList, IndexPattern } from '../../../../data/common/index_patterns';

const indexPatternPrev: IndexPattern = {
  id: 'prev',
  getFieldByName(name) {
    return this.fields.getByName(name);
  },
  fields: {
    getByName: (name: string) => {
      const fields = [
        { name: 'category', sortable: true },
        { name: 'name', sortable: true },
      ] as IIndexPatternFieldList;
      return fields.find((field) => field.name === name);
    },
  },
} as IndexPattern;

const indexPatternNext = {
  id: 'next',
  getFieldByName(name) {
    return this.fields.getByName(name);
  },
  fields: {
    getByName: (name: string) => {
      const fields = [{ name: 'category', sortable: true }] as IIndexPatternFieldList;
      return fields.find((field) => field.name === name);
    },
  },
} as IndexPattern;

describe('Discover getSwitchIndexPatternAppState', () => {
  test('removing fields that are not part of the next index pattern, keeping unknown fields ', async () => {
    const result = getSwitchIndexPatternAppState(
      indexPatternNext,
      indexPatternPrev,
      ['category', 'name', 'unknown'],
      [['category', 'desc']]
    );
    expect(result).toMatchInlineSnapshot(`
      Object {
        "columns": Array [
          "category",
          "unknown",
        ],
        "index": "next",
        "sort": Array [
          Array [
            "category",
            "desc",
          ],
        ],
      }
    `);
  });
  test('removing sorted by fields that are not part of the next index pattern', async () => {
    const result = getSwitchIndexPatternAppState(
      indexPatternNext,
      indexPatternPrev,
      ['name'],
      [
        ['category', 'desc'],
        ['name', 'asc'],
      ]
    );
    expect(result).toMatchInlineSnapshot(`
      Object {
        "columns": Array [
          "_source",
        ],
        "index": "next",
        "sort": Array [
          Array [
            "category",
            "desc",
          ],
        ],
      }
    `);
  });
});
