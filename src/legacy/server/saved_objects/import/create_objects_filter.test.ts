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
  test('filters should return false when contains empty parameters', () => {
    const fn = createObjectsFilter([], [], []);
    expect(fn({ type: 'a', id: '1', attributes: {}, references: [] })).toEqual(false);
  });

  test('filters should exclude skips', () => {
    const fn = createObjectsFilter(
      [
        {
          type: 'a',
          id: '1',
        },
      ],
      [],
      [
        {
          type: 'b',
          from: '1',
          to: '2',
        },
      ]
    );
    expect(
      fn({
        type: 'a',
        id: '1',
        attributes: {},
        references: [{ name: 'ref_0', type: 'b', id: '1' }],
      })
    ).toEqual(false);
    expect(
      fn({
        type: 'a',
        id: '2',
        attributes: {},
        references: [{ name: 'ref_0', type: 'b', id: '1' }],
      })
    ).toEqual(true);
  });

  test('filter should include references to replace', () => {
    const fn = createObjectsFilter(
      [],
      [],
      [
        {
          type: 'b',
          from: '1',
          to: '2',
        },
      ]
    );
    expect(
      fn({
        type: 'a',
        id: '1',
        attributes: {},
        references: [
          {
            name: 'ref_0',
            type: 'b',
            id: '1',
          },
        ],
      })
    ).toEqual(true);
    expect(
      fn({
        type: 'a',
        id: '1',
        attributes: {},
        references: [
          {
            name: 'ref_0',
            type: 'b',
            id: '2',
          },
        ],
      })
    ).toEqual(false);
  });

  test('filter should include objects to overwrite', () => {
    const fn = createObjectsFilter(
      [],
      [
        {
          type: 'a',
          id: '1',
        },
      ],
      []
    );
    expect(fn({ type: 'a', id: '1', attributes: {}, references: [] })).toEqual(true);
    expect(fn({ type: 'a', id: '2', attributes: {}, references: [] })).toEqual(false);
  });

  test('filter should work with skips, overwrites and replaceReferences', () => {
    const fn = createObjectsFilter(
      [
        {
          type: 'a',
          id: '1',
        },
      ],
      [
        {
          type: 'a',
          id: '2',
        },
      ],
      [
        {
          type: 'b',
          from: '1',
          to: '2',
        },
      ]
    );
    expect(
      fn({
        type: 'a',
        id: '1',
        attributes: {},
        references: [
          {
            name: 'ref_0',
            type: 'b',
            id: '1',
          },
        ],
      })
    ).toEqual(false);
    expect(
      fn({
        type: 'a',
        id: '2',
        attributes: {},
        references: [
          {
            name: 'ref_0',
            type: 'b',
            id: '2',
          },
        ],
      })
    ).toEqual(true);
    expect(
      fn({
        type: 'a',
        id: '3',
        attributes: {},
        references: [
          {
            name: 'ref_0',
            type: 'b',
            id: '1',
          },
        ],
      })
    ).toEqual(true);
  });
});
