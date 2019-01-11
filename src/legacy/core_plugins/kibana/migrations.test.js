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

import migrations from './migrations';

describe('search', () => {
  describe('7.0.0', () => {
    const migration = migrations.search['7.0.0'];

    test('skips errors when searchSourceJSON is null', () => {
      const doc = {
        id: '123',
        type: 'search',
        attributes: {
          foo: true,
          kibanaSavedObjectMeta: {
            searchSourceJSON: null,
          },
        },
      };
      const migratedDoc = migration(doc);
      expect(migratedDoc).toMatchInlineSnapshot(`
Object {
  "attributes": Object {
    "foo": true,
    "kibanaSavedObjectMeta": Object {
      "searchSourceJSON": null,
    },
  },
  "id": "123",
  "references": Array [],
  "type": "search",
}
`);
    });

    test('skips errors when searchSourceJSON is undefined', () => {
      const doc = {
        id: '123',
        type: 'search',
        attributes: {
          foo: true,
          kibanaSavedObjectMeta: {
            searchSourceJSON: undefined,
          },
        },
      };
      const migratedDoc = migration(doc);
      expect(migratedDoc).toMatchInlineSnapshot(`
Object {
  "attributes": Object {
    "foo": true,
    "kibanaSavedObjectMeta": Object {
      "searchSourceJSON": undefined,
    },
  },
  "id": "123",
  "references": Array [],
  "type": "search",
}
`);
    });

    test('throw error when searchSourceJSON is not a string', () => {
      const doc = {
        id: '123',
        type: 'search',
        attributes: {
          foo: true,
          kibanaSavedObjectMeta: {
            searchSourceJSON: 123,
          },
        },
      };
      expect(() => migration(doc)).toThrowErrorMatchingInlineSnapshot(
        `"searchSourceJSON is not a string on search \\"123\\""`
      );
    });

    test('skips error when "index" is missing from searchSourceJSON', () => {
      const doc = {
        id: '123',
        type: 'search',
        attributes: {
          foo: true,
          kibanaSavedObjectMeta: {
            searchSourceJSON: JSON.stringify({ bar: true }),
          },
        },
      };
      const migratedDoc = migration(doc);
      expect(migratedDoc).toMatchInlineSnapshot(`
Object {
  "attributes": Object {
    "foo": true,
    "kibanaSavedObjectMeta": Object {
      "searchSourceJSON": "{\\"bar\\":true}",
    },
  },
  "id": "123",
  "references": Array [],
  "type": "search",
}
`);
    });

    test('extracts "index" attribute from doc', () => {
      const doc = {
        id: '123',
        type: 'search',
        attributes: {
          foo: true,
          kibanaSavedObjectMeta: {
            searchSourceJSON: JSON.stringify({ bar: true, index: 'pattern*' }),
          },
        },
      };
      const migratedDoc = migration(doc);
      expect(migratedDoc).toMatchInlineSnapshot(`
Object {
  "attributes": Object {
    "foo": true,
    "kibanaSavedObjectMeta": Object {
      "searchSourceJSON": "{\\"bar\\":true,\\"index\\":\\"kibanaSavedObjectMeta.searchSourceJSON.index\\"}",
    },
  },
  "id": "123",
  "references": Array [
    Object {
      "id": "pattern*",
      "name": "kibanaSavedObjectMeta.searchSourceJSON.index",
      "type": "index-pattern",
    },
  ],
  "type": "search",
}
`);
    });
  });
});
