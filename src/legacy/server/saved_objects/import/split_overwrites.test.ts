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

import { splitOverwrites } from './split_overwrites';

describe('splitOverwrites()', () => {
  test('should split array accordingly', () => {
    const retries = [
      {
        type: 'a',
        id: '1',
        overwrite: true,
        replaceReferences: [],
      },
      {
        id: '2',
        type: 'b',
        overwrite: false,
        replaceReferences: [],
      },
      {
        type: 'c',
        id: '3',
        overwrite: true,
        replaceReferences: [],
      },
    ];
    const savedObjects = [
      {
        id: '1',
        type: 'a',
        attributes: {},
        references: [],
      },
      {
        id: '2',
        type: 'b',
        attributes: {},
        references: [],
      },
      {
        id: '3',
        type: 'c',
        attributes: {},
        references: [],
      },
    ];
    const result = splitOverwrites(savedObjects, retries);
    expect(result).toMatchInlineSnapshot(`
Object {
  "objectsToNotOverwrite": Array [
    Object {
      "attributes": Object {},
      "id": "2",
      "references": Array [],
      "type": "b",
    },
  ],
  "objectsToOverwrite": Array [
    Object {
      "attributes": Object {},
      "id": "1",
      "references": Array [],
      "type": "a",
    },
    Object {
      "attributes": Object {},
      "id": "3",
      "references": Array [],
      "type": "c",
    },
  ],
}
`);
  });
});
