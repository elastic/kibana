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

import { getDefaultFieldFilter, setFieldFilterProp, isFieldFiltered } from './field_filter';
import { IndexPatternField } from '../../../../../../data/public';

describe('field_filter', function () {
  it('getDefaultFieldFilter should return default filter state', function () {
    expect(getDefaultFieldFilter()).toMatchInlineSnapshot(`
      Object {
        "aggregatable": null,
        "missing": true,
        "name": "",
        "searchable": null,
        "type": "any",
      }
    `);
  });
  it('setFieldFilterProp should return allow filter changes', function () {
    const state = getDefaultFieldFilter();
    const targetState = {
      aggregatable: true,
      missing: true,
      name: 'test',
      searchable: true,
      type: 'string',
    };
    const actualState = Object.entries(targetState).reduce((acc, kv) => {
      return setFieldFilterProp(acc, kv[0], kv[1]);
    }, state);
    expect(actualState).toMatchInlineSnapshot(`
      Object {
        "aggregatable": true,
        "missing": true,
        "name": "test",
        "searchable": true,
        "type": "string",
      }
    `);
  });
  it('filters a given list', () => {
    const defaultState = getDefaultFieldFilter();
    const fieldList = [
      {
        name: 'bytes',
        type: 'number',
        esTypes: ['long'],
        count: 10,
        scripted: false,
        searchable: false,
        aggregatable: false,
      },
      {
        name: 'extension',
        type: 'string',
        esTypes: ['text'],
        count: 10,
        scripted: true,
        searchable: true,
        aggregatable: true,
      },
    ] as IndexPatternField[];

    [
      { filter: {}, result: ['bytes', 'extension'] },
      { filter: { name: 'by' }, result: ['bytes'] },
      { filter: { aggregatable: true }, result: ['extension'] },
      { filter: { aggregatable: true, searchable: false }, result: [] },
      { filter: { type: 'string' }, result: ['extension'] },
    ].forEach((test) => {
      const filtered = fieldList
        .filter((field) =>
          isFieldFiltered(field, { ...defaultState, ...test.filter }, { bytes: 1, extension: 1 })
        )
        .map((field) => field.name);

      expect(filtered).toEqual(test.result);
    });
  });
});
