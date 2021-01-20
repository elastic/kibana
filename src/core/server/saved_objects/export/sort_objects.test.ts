/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { sortObjects } from './sort_objects';

describe('sortObjects()', () => {
  test('should return on empty array', () => {
    expect(sortObjects([])).toEqual([]);
  });

  test('should not change sorted array', () => {
    const docs = [
      {
        id: '1',
        type: 'index-pattern',
        attributes: {},
        references: [],
      },
      {
        id: '2',
        type: 'search',
        attributes: {},
        references: [
          {
            name: 'ref1',
            type: 'index-pattern',
            id: '1',
          },
        ],
      },
    ];
    expect(sortObjects(docs)).toMatchInlineSnapshot(`
      Array [
        Object {
          "attributes": Object {},
          "id": "1",
          "references": Array [],
          "type": "index-pattern",
        },
        Object {
          "attributes": Object {},
          "id": "2",
          "references": Array [
            Object {
              "id": "1",
              "name": "ref1",
              "type": "index-pattern",
            },
          ],
          "type": "search",
        },
      ]
    `);
  });

  test('should not mutate parameter', () => {
    const docs = [
      {
        id: '2',
        type: 'search',
        attributes: {},
        references: [
          {
            name: 'ref1',
            type: 'index-pattern',
            id: '1',
          },
        ],
      },
      {
        id: '1',
        type: 'index-pattern',
        attributes: {},
        references: [],
      },
    ];
    expect(sortObjects(docs)).toMatchInlineSnapshot(`
      Array [
        Object {
          "attributes": Object {},
          "id": "1",
          "references": Array [],
          "type": "index-pattern",
        },
        Object {
          "attributes": Object {},
          "id": "2",
          "references": Array [
            Object {
              "id": "1",
              "name": "ref1",
              "type": "index-pattern",
            },
          ],
          "type": "search",
        },
      ]
    `);
    expect(docs).toMatchInlineSnapshot(`
      Array [
        Object {
          "attributes": Object {},
          "id": "2",
          "references": Array [
            Object {
              "id": "1",
              "name": "ref1",
              "type": "index-pattern",
            },
          ],
          "type": "search",
        },
        Object {
          "attributes": Object {},
          "id": "1",
          "references": Array [],
          "type": "index-pattern",
        },
      ]
    `);
  });

  test('should sort unordered array', () => {
    const docs = [
      {
        id: '5',
        type: 'dashboard',
        attributes: {},
        references: [
          {
            name: 'ref1',
            type: 'visualization',
            id: '3',
          },
          {
            name: 'ref2',
            type: 'visualization',
            id: '4',
          },
        ],
      },
      {
        id: '4',
        type: 'visualization',
        attributes: {},
        references: [
          {
            name: 'ref1',
            type: 'index-pattern',
            id: '1',
          },
        ],
      },
      {
        id: '3',
        type: 'visualization',
        attributes: {},
        references: [
          {
            name: 'ref1',
            type: 'search',
            id: '2',
          },
        ],
      },
      {
        id: '2',
        type: 'search',
        attributes: {},
        references: [
          {
            name: 'ref1',
            type: 'index-pattern',
            id: '1',
          },
        ],
      },
      {
        id: '1',
        type: 'index-pattern',
        attributes: {},
        references: [],
      },
    ];
    expect(sortObjects(docs)).toMatchInlineSnapshot(`
      Array [
        Object {
          "attributes": Object {},
          "id": "1",
          "references": Array [],
          "type": "index-pattern",
        },
        Object {
          "attributes": Object {},
          "id": "2",
          "references": Array [
            Object {
              "id": "1",
              "name": "ref1",
              "type": "index-pattern",
            },
          ],
          "type": "search",
        },
        Object {
          "attributes": Object {},
          "id": "3",
          "references": Array [
            Object {
              "id": "2",
              "name": "ref1",
              "type": "search",
            },
          ],
          "type": "visualization",
        },
        Object {
          "attributes": Object {},
          "id": "4",
          "references": Array [
            Object {
              "id": "1",
              "name": "ref1",
              "type": "index-pattern",
            },
          ],
          "type": "visualization",
        },
        Object {
          "attributes": Object {},
          "id": "5",
          "references": Array [
            Object {
              "id": "3",
              "name": "ref1",
              "type": "visualization",
            },
            Object {
              "id": "4",
              "name": "ref2",
              "type": "visualization",
            },
          ],
          "type": "dashboard",
        },
      ]
    `);
  });

  test('should not fail on circular dependencies', () => {
    const docs = [
      {
        id: '1',
        type: 'foo',
        attributes: {},
        references: [
          {
            name: 'ref1',
            type: 'foo',
            id: '2',
          },
        ],
      },
      {
        id: '2',
        type: 'foo',
        attributes: {},
        references: [
          {
            name: 'ref1',
            type: 'foo',
            id: '1',
          },
        ],
      },
    ];

    expect(sortObjects(docs)).toMatchInlineSnapshot(`
      Array [
        Object {
          "attributes": Object {},
          "id": "2",
          "references": Array [
            Object {
              "id": "1",
              "name": "ref1",
              "type": "foo",
            },
          ],
          "type": "foo",
        },
        Object {
          "attributes": Object {},
          "id": "1",
          "references": Array [
            Object {
              "id": "2",
              "name": "ref1",
              "type": "foo",
            },
          ],
          "type": "foo",
        },
      ]
    `);
  });
  test('should not fail on complex circular dependencies', () => {
    const docs = [
      {
        id: '1',
        type: 'foo',
        attributes: {},
        references: [
          {
            name: 'ref12',
            type: 'foo',
            id: '2',
          },
          {
            name: 'ref13',
            type: 'baz',
            id: '3',
          },
        ],
      },
      {
        id: '2',
        type: 'foo',
        attributes: {},
        references: [
          {
            name: 'ref13',
            type: 'foo',
            id: '3',
          },
        ],
      },
      {
        id: '3',
        type: 'baz',
        attributes: {},
        references: [
          {
            name: 'ref13',
            type: 'xyz',
            id: '4',
          },
        ],
      },
      {
        id: '4',
        type: 'xyz',
        attributes: {},
        references: [
          {
            name: 'ref14',
            type: 'foo',
            id: '1',
          },
        ],
      },
    ];

    expect(sortObjects(docs)).toMatchInlineSnapshot(`
      Array [
        Object {
          "attributes": Object {},
          "id": "2",
          "references": Array [
            Object {
              "id": "3",
              "name": "ref13",
              "type": "foo",
            },
          ],
          "type": "foo",
        },
        Object {
          "attributes": Object {},
          "id": "4",
          "references": Array [
            Object {
              "id": "1",
              "name": "ref14",
              "type": "foo",
            },
          ],
          "type": "xyz",
        },
        Object {
          "attributes": Object {},
          "id": "3",
          "references": Array [
            Object {
              "id": "4",
              "name": "ref13",
              "type": "xyz",
            },
          ],
          "type": "baz",
        },
        Object {
          "attributes": Object {},
          "id": "1",
          "references": Array [
            Object {
              "id": "2",
              "name": "ref12",
              "type": "foo",
            },
            Object {
              "id": "3",
              "name": "ref13",
              "type": "baz",
            },
          ],
          "type": "foo",
        },
      ]
    `);
  });
});
