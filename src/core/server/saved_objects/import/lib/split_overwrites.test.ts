/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
