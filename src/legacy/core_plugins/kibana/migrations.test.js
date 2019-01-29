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

import { migrations } from './migrations';

describe('visualization', () => {
  describe('7.0.0', () => {
    const migrate = doc => migrations.visualization['7.0.0'](doc);
    const generateDoc = ({ type, aggs }) => ({
      attributes: {
        title: 'My Vis',
        description: 'This is my super cool vis.',
        visState: JSON.stringify({ type, aggs }),
        uiStateJSON: '{}',
        version: 1,
        kibanaSavedObjectMeta: {
          searchSourceJSON: '{}',
        },
      },
    });

    it('does not throw error on empty object', () => {
      const migratedDoc = migrate({
        attributes: {
          visState: '{}',
        },
      });
      expect(migratedDoc).toMatchInlineSnapshot(`
Object {
  "attributes": Object {
    "visState": "{}",
  },
  "references": Array [],
}
`);
    });

    it('skips errors when searchSourceJSON is null', () => {
      const doc = {
        id: '1',
        type: 'visualization',
        attributes: {
          visState: '{}',
          kibanaSavedObjectMeta: {
            searchSourceJSON: null,
          },
          savedSearchId: '123',
        },
      };
      const migratedDoc = migrate(doc);
      expect(migratedDoc).toMatchInlineSnapshot(`
Object {
  "attributes": Object {
    "kibanaSavedObjectMeta": Object {
      "searchSourceJSON": null,
    },
    "savedSearchRefName": "search_0",
    "visState": "{}",
  },
  "id": "1",
  "references": Array [
    Object {
      "id": "123",
      "name": "search_0",
      "type": "search",
    },
  ],
  "type": "visualization",
}
`);
    });

    it('skips errors when searchSourceJSON is undefined', () => {
      const doc = {
        id: '1',
        type: 'visualization',
        attributes: {
          visState: '{}',
          kibanaSavedObjectMeta: {
            searchSourceJSON: undefined,
          },
          savedSearchId: '123',
        },
      };
      const migratedDoc = migrate(doc);
      expect(migratedDoc).toMatchInlineSnapshot(`
Object {
  "attributes": Object {
    "kibanaSavedObjectMeta": Object {
      "searchSourceJSON": undefined,
    },
    "savedSearchRefName": "search_0",
    "visState": "{}",
  },
  "id": "1",
  "references": Array [
    Object {
      "id": "123",
      "name": "search_0",
      "type": "search",
    },
  ],
  "type": "visualization",
}
`);
    });

    it('skips error when searchSourceJSON is not a string', () => {
      const doc = {
        id: '1',
        type: 'visualization',
        attributes: {
          visState: '{}',
          kibanaSavedObjectMeta: {
            searchSourceJSON: 123,
          },
          savedSearchId: '123',
        },
      };
      expect(migrate(doc)).toMatchInlineSnapshot(`
Object {
  "attributes": Object {
    "kibanaSavedObjectMeta": Object {
      "searchSourceJSON": 123,
    },
    "savedSearchRefName": "search_0",
    "visState": "{}",
  },
  "id": "1",
  "references": Array [
    Object {
      "id": "123",
      "name": "search_0",
      "type": "search",
    },
  ],
  "type": "visualization",
}
`);
    });

    it('skips error when searchSourceJSON is invalid json', () => {
      const doc = {
        id: '1',
        type: 'visualization',
        attributes: {
          visState: '{}',
          kibanaSavedObjectMeta: {
            searchSourceJSON: '{abc123}',
          },
          savedSearchId: '123',
        },
      };
      expect(migrate(doc)).toMatchInlineSnapshot(`
Object {
  "attributes": Object {
    "kibanaSavedObjectMeta": Object {
      "searchSourceJSON": "{abc123}",
    },
    "savedSearchRefName": "search_0",
    "visState": "{}",
  },
  "id": "1",
  "references": Array [
    Object {
      "id": "123",
      "name": "search_0",
      "type": "search",
    },
  ],
  "type": "visualization",
}
`);
    });

    it('skips error when "index" is missing from searchSourceJSON', () => {
      const doc = {
        id: '1',
        type: 'visualization',
        attributes: {
          visState: '{}',
          kibanaSavedObjectMeta: {
            searchSourceJSON: JSON.stringify({ bar: true }),
          },
          savedSearchId: '123',
        },
      };
      const migratedDoc = migrate(doc);
      expect(migratedDoc).toMatchInlineSnapshot(`
Object {
  "attributes": Object {
    "kibanaSavedObjectMeta": Object {
      "searchSourceJSON": "{\\"bar\\":true}",
    },
    "savedSearchRefName": "search_0",
    "visState": "{}",
  },
  "id": "1",
  "references": Array [
    Object {
      "id": "123",
      "name": "search_0",
      "type": "search",
    },
  ],
  "type": "visualization",
}
`);
    });

    it('extracts "index" attribute from doc', () => {
      const doc = {
        id: '1',
        type: 'visualization',
        attributes: {
          visState: '{}',
          kibanaSavedObjectMeta: {
            searchSourceJSON: JSON.stringify({ bar: true, index: 'pattern*' }),
          },
          savedSearchId: '123',
        },
      };
      const migratedDoc = migrate(doc);
      expect(migratedDoc).toMatchInlineSnapshot(`
Object {
  "attributes": Object {
    "kibanaSavedObjectMeta": Object {
      "searchSourceJSON": "{\\"bar\\":true,\\"indexRefName\\":\\"kibanaSavedObjectMeta.searchSourceJSON.index\\"}",
    },
    "savedSearchRefName": "search_0",
    "visState": "{}",
  },
  "id": "1",
  "references": Array [
    Object {
      "id": "pattern*",
      "name": "kibanaSavedObjectMeta.searchSourceJSON.index",
      "type": "index-pattern",
    },
    Object {
      "id": "123",
      "name": "search_0",
      "type": "search",
    },
  ],
  "type": "visualization",
}
`);
    });

    it('skips extracting savedSearchId when missing', () => {
      const doc = {
        id: '1',
        attributes: {
          visState: '{}',
          kibanaSavedObjectMeta: {
            searchSourceJSON: '{}',
          },
        },
      };
      const migratedDoc = migrate(doc);
      expect(migratedDoc).toMatchInlineSnapshot(`
Object {
  "attributes": Object {
    "kibanaSavedObjectMeta": Object {
      "searchSourceJSON": "{}",
    },
    "visState": "{}",
  },
  "id": "1",
  "references": Array [],
}
`);
    });

    it('extract savedSearchId from doc', () => {
      const doc = {
        id: '1',
        attributes: {
          visState: '{}',
          kibanaSavedObjectMeta: {
            searchSourceJSON: '{}',
          },
          savedSearchId: '123',
        },
      };
      const migratedDoc = migrate(doc);
      expect(migratedDoc).toMatchInlineSnapshot(`
Object {
  "attributes": Object {
    "kibanaSavedObjectMeta": Object {
      "searchSourceJSON": "{}",
    },
    "savedSearchRefName": "search_0",
    "visState": "{}",
  },
  "id": "1",
  "references": Array [
    Object {
      "id": "123",
      "name": "search_0",
      "type": "search",
    },
  ],
}
`);
    });

    it('should return a new object if vis is table and has multiple split aggs', () => {
      const aggs = [
        {
          id: '1',
          schema: 'metric',
          params: {},
        },
        {
          id: '2',
          schema: 'split',
          params: { foo: 'bar', row: true },
        },
        {
          id: '3',
          schema: 'split',
          params: { hey: 'ya', row: false },
        },
      ];
      const tableDoc = generateDoc({ type: 'table', aggs });
      const expected = tableDoc;
      const actual = migrate(tableDoc);
      expect(actual).not.toBe(expected);
    });

    it('should not touch any vis that is not table', () => {
      const aggs = [];
      const pieDoc = generateDoc({ type: 'pie', aggs });
      const expected = pieDoc;
      const actual = migrate(pieDoc);
      expect(actual).toBe(expected);
    });

    it('should not change values in any vis that is not table', () => {
      const aggs = [
        {
          id: '1',
          schema: 'metric',
          params: {},
        },
        {
          id: '2',
          schema: 'split',
          params: { foo: 'bar', row: true },
        },
        {
          id: '3',
          schema: 'segment',
          params: { hey: 'ya' },
        },
      ];
      const pieDoc = generateDoc({ type: 'pie', aggs });
      const expected = pieDoc;
      const actual = migrate(pieDoc);
      expect(actual).toEqual(expected);
    });

    it('should not touch table vis if there are not multiple split aggs', () => {
      const aggs = [
        {
          id: '1',
          schema: 'metric',
          params: {},
        },
        {
          id: '2',
          schema: 'split',
          params: { foo: 'bar', row: true },
        },
      ];
      const tableDoc = generateDoc({ type: 'table', aggs });
      const expected = tableDoc;
      const actual = migrate(tableDoc);
      expect(actual).toBe(expected);
    });

    it('should change all split aggs to `bucket` except the first', () => {
      const aggs = [
        {
          id: '1',
          schema: 'metric',
          params: {},
        },
        {
          id: '2',
          schema: 'split',
          params: { foo: 'bar', row: true },
        },
        {
          id: '3',
          schema: 'split',
          params: { hey: 'ya', row: false },
        },
        {
          id: '4',
          schema: 'bucket',
          params: { heyyy: 'yaaa' },
        },
      ];
      const expected = ['metric', 'split', 'bucket', 'bucket'];
      const migrated = migrate(generateDoc({ type: 'table', aggs }));
      const actual = JSON.parse(migrated.attributes.visState);
      expect(actual.aggs.map(agg => agg.schema)).toEqual(expected);
    });

    it('should remove `rows` param from any aggs that are not `split`', () => {
      const aggs = [
        {
          id: '1',
          schema: 'metric',
          params: {},
        },
        {
          id: '2',
          schema: 'split',
          params: { foo: 'bar', row: true },
        },
        {
          id: '3',
          schema: 'split',
          params: { hey: 'ya', row: false },
        },
      ];
      const expected = [{}, { foo: 'bar', row: true }, { hey: 'ya' }];
      const migrated = migrate(generateDoc({ type: 'table', aggs }));
      const actual = JSON.parse(migrated.attributes.visState);
      expect(actual.aggs.map(agg => agg.params)).toEqual(expected);
    });

    it('should throw with a reference to the doc name if something goes wrong', () => {
      const doc = {
        attributes: {
          title: 'My Vis',
          description: 'This is my super cool vis.',
          visState: '!/// Intentionally malformed JSON ///!',
          uiStateJSON: '{}',
          version: 1,
          kibanaSavedObjectMeta: {
            searchSourceJSON: '{}',
          },
        },
      };
      expect(() => migrate(doc)).toThrowError(/My Vis/);
    });
  });
});

describe('dashboard', () => {
  describe('7.0.0', () => {
    const migration = migrations.dashboard['7.0.0'];

    test('skips error on empty object', () => {
      expect(migration({})).toMatchInlineSnapshot(`
Object {
  "references": Array [],
}
`);
    });

    test('skips errors when searchSourceJSON is null', () => {
      const doc = {
        id: '1',
        type: 'dashboard',
        attributes: {
          kibanaSavedObjectMeta: {
            searchSourceJSON: null,
          },
          panelsJSON:
            '[{"id":"1","type":"visualization","foo":true},{"id":"2","type":"visualization","bar":true}]',
        },
      };
      const migratedDoc = migration(doc);
      expect(migratedDoc).toMatchInlineSnapshot(`
Object {
  "attributes": Object {
    "kibanaSavedObjectMeta": Object {
      "searchSourceJSON": null,
    },
    "panelsJSON": "[{\\"foo\\":true,\\"panelRefName\\":\\"panel_0\\"},{\\"bar\\":true,\\"panelRefName\\":\\"panel_1\\"}]",
  },
  "id": "1",
  "references": Array [
    Object {
      "id": "1",
      "name": "panel_0",
      "type": "visualization",
    },
    Object {
      "id": "2",
      "name": "panel_1",
      "type": "visualization",
    },
  ],
  "type": "dashboard",
}
`);
    });

    test('skips errors when searchSourceJSON is undefined', () => {
      const doc = {
        id: '1',
        type: 'dashboard',
        attributes: {
          kibanaSavedObjectMeta: {
            searchSourceJSON: undefined,
          },
          panelsJSON:
            '[{"id":"1","type":"visualization","foo":true},{"id":"2","type":"visualization","bar":true}]',
        },
      };
      const migratedDoc = migration(doc);
      expect(migratedDoc).toMatchInlineSnapshot(`
Object {
  "attributes": Object {
    "kibanaSavedObjectMeta": Object {
      "searchSourceJSON": undefined,
    },
    "panelsJSON": "[{\\"foo\\":true,\\"panelRefName\\":\\"panel_0\\"},{\\"bar\\":true,\\"panelRefName\\":\\"panel_1\\"}]",
  },
  "id": "1",
  "references": Array [
    Object {
      "id": "1",
      "name": "panel_0",
      "type": "visualization",
    },
    Object {
      "id": "2",
      "name": "panel_1",
      "type": "visualization",
    },
  ],
  "type": "dashboard",
}
`);
    });

    test('skips error when searchSourceJSON is not a string', () => {
      const doc = {
        id: '1',
        type: 'dashboard',
        attributes: {
          kibanaSavedObjectMeta: {
            searchSourceJSON: 123,
          },
          panelsJSON:
            '[{"id":"1","type":"visualization","foo":true},{"id":"2","type":"visualization","bar":true}]',
        },
      };
      expect(migration(doc)).toMatchInlineSnapshot(`
Object {
  "attributes": Object {
    "kibanaSavedObjectMeta": Object {
      "searchSourceJSON": 123,
    },
    "panelsJSON": "[{\\"foo\\":true,\\"panelRefName\\":\\"panel_0\\"},{\\"bar\\":true,\\"panelRefName\\":\\"panel_1\\"}]",
  },
  "id": "1",
  "references": Array [
    Object {
      "id": "1",
      "name": "panel_0",
      "type": "visualization",
    },
    Object {
      "id": "2",
      "name": "panel_1",
      "type": "visualization",
    },
  ],
  "type": "dashboard",
}
`);
    });

    test('skips error when searchSourceJSON is invalid json', () => {
      const doc = {
        id: '1',
        type: 'dashboard',
        attributes: {
          kibanaSavedObjectMeta: {
            searchSourceJSON: '{abc123}',
          },
          panelsJSON:
            '[{"id":"1","type":"visualization","foo":true},{"id":"2","type":"visualization","bar":true}]',
        },
      };
      expect(migration(doc)).toMatchInlineSnapshot(`
Object {
  "attributes": Object {
    "kibanaSavedObjectMeta": Object {
      "searchSourceJSON": "{abc123}",
    },
    "panelsJSON": "[{\\"foo\\":true,\\"panelRefName\\":\\"panel_0\\"},{\\"bar\\":true,\\"panelRefName\\":\\"panel_1\\"}]",
  },
  "id": "1",
  "references": Array [
    Object {
      "id": "1",
      "name": "panel_0",
      "type": "visualization",
    },
    Object {
      "id": "2",
      "name": "panel_1",
      "type": "visualization",
    },
  ],
  "type": "dashboard",
}
`);
    });

    test('skips error when "index" is missing from searchSourceJSON', () => {
      const doc = {
        id: '1',
        type: 'dashboard',
        attributes: {
          kibanaSavedObjectMeta: {
            searchSourceJSON: JSON.stringify({ bar: true }),
          },
          panelsJSON:
            '[{"id":"1","type":"visualization","foo":true},{"id":"2","type":"visualization","bar":true}]',
        },
      };
      const migratedDoc = migration(doc);
      expect(migratedDoc).toMatchInlineSnapshot(`
Object {
  "attributes": Object {
    "kibanaSavedObjectMeta": Object {
      "searchSourceJSON": "{\\"bar\\":true}",
    },
    "panelsJSON": "[{\\"foo\\":true,\\"panelRefName\\":\\"panel_0\\"},{\\"bar\\":true,\\"panelRefName\\":\\"panel_1\\"}]",
  },
  "id": "1",
  "references": Array [
    Object {
      "id": "1",
      "name": "panel_0",
      "type": "visualization",
    },
    Object {
      "id": "2",
      "name": "panel_1",
      "type": "visualization",
    },
  ],
  "type": "dashboard",
}
`);
    });

    test('extracts "index" attribute from doc', () => {
      const doc = {
        id: '1',
        type: 'dashboard',
        attributes: {
          kibanaSavedObjectMeta: {
            searchSourceJSON: JSON.stringify({ bar: true, index: 'pattern*' }),
          },
          panelsJSON:
            '[{"id":"1","type":"visualization","foo":true},{"id":"2","type":"visualization","bar":true}]',
        },
      };
      const migratedDoc = migration(doc);
      expect(migratedDoc).toMatchInlineSnapshot(`
Object {
  "attributes": Object {
    "kibanaSavedObjectMeta": Object {
      "searchSourceJSON": "{\\"bar\\":true,\\"indexRefName\\":\\"kibanaSavedObjectMeta.searchSourceJSON.index\\"}",
    },
    "panelsJSON": "[{\\"foo\\":true,\\"panelRefName\\":\\"panel_0\\"},{\\"bar\\":true,\\"panelRefName\\":\\"panel_1\\"}]",
  },
  "id": "1",
  "references": Array [
    Object {
      "id": "pattern*",
      "name": "kibanaSavedObjectMeta.searchSourceJSON.index",
      "type": "index-pattern",
    },
    Object {
      "id": "1",
      "name": "panel_0",
      "type": "visualization",
    },
    Object {
      "id": "2",
      "name": "panel_1",
      "type": "visualization",
    },
  ],
  "type": "dashboard",
}
`);
    });

    test('skips error when panelsJSON is not a string', () => {
      const doc = {
        id: '1',
        attributes: {
          panelsJSON: 123,
        },
      };
      expect(migration(doc)).toMatchInlineSnapshot(`
Object {
  "attributes": Object {
    "panelsJSON": 123,
  },
  "id": "1",
  "references": Array [],
}
`);
    });

    test('skips error when panelsJSON is not valid JSON', () => {
      const doc = {
        id: '1',
        attributes: {
          panelsJSON: '{123abc}',
        },
      };
      expect(migration(doc)).toMatchInlineSnapshot(`
Object {
  "attributes": Object {
    "panelsJSON": "{123abc}",
  },
  "id": "1",
  "references": Array [],
}
`);
    });

    test('skips panelsJSON when its not an array', () => {
      const doc = {
        id: '1',
        attributes: {
          panelsJSON: '{}',
        },
      };
      expect(migration(doc)).toMatchInlineSnapshot(`
Object {
  "attributes": Object {
    "panelsJSON": "{}",
  },
  "id": "1",
  "references": Array [],
}
`);
    });

    test('skips error when a panel is missing "type" attribute', () => {
      const doc = {
        id: '1',
        attributes: {
          panelsJSON: '[{"id":"123"}]',
        },
      };
      expect(migration(doc)).toMatchInlineSnapshot(`
Object {
  "attributes": Object {
    "panelsJSON": "[{\\"id\\":\\"123\\"}]",
  },
  "id": "1",
  "references": Array [],
}
`);
    });

    test('skips error when a panel is missing "id" attribute', () => {
      const doc = {
        id: '1',
        attributes: {
          panelsJSON: '[{"type":"visualization"}]',
        },
      };
      expect(migration(doc)).toMatchInlineSnapshot(`
Object {
  "attributes": Object {
    "panelsJSON": "[{\\"type\\":\\"visualization\\"}]",
  },
  "id": "1",
  "references": Array [],
}
`);
    });

    test('extract panel references from doc', () => {
      const doc = {
        id: '1',
        attributes: {
          panelsJSON:
            '[{"id":"1","type":"visualization","foo":true},{"id":"2","type":"visualization","bar":true}]',
        },
      };
      const migratedDoc = migration(doc);
      expect(migratedDoc).toMatchInlineSnapshot(`
Object {
  "attributes": Object {
    "panelsJSON": "[{\\"foo\\":true,\\"panelRefName\\":\\"panel_0\\"},{\\"bar\\":true,\\"panelRefName\\":\\"panel_1\\"}]",
  },
  "id": "1",
  "references": Array [
    Object {
      "id": "1",
      "name": "panel_0",
      "type": "visualization",
    },
    Object {
      "id": "2",
      "name": "panel_1",
      "type": "visualization",
    },
  ],
}
`);
    });
  });
});

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

    test('skips error when searchSourceJSON is not a string', () => {
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
      expect(migration(doc)).toMatchInlineSnapshot(`
Object {
  "attributes": Object {
    "foo": true,
    "kibanaSavedObjectMeta": Object {
      "searchSourceJSON": 123,
    },
  },
  "id": "123",
  "references": Array [],
  "type": "search",
}
`);
    });

    test('skips error when searchSourceJSON is invalid json', () => {
      const doc = {
        id: '123',
        type: 'search',
        attributes: {
          foo: true,
          kibanaSavedObjectMeta: {
            searchSourceJSON: '{abc123}',
          },
        },
      };
      expect(migration(doc)).toMatchInlineSnapshot(`
Object {
  "attributes": Object {
    "foo": true,
    "kibanaSavedObjectMeta": Object {
      "searchSourceJSON": "{abc123}",
    },
  },
  "id": "123",
  "references": Array [],
  "type": "search",
}
`);
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
      "searchSourceJSON": "{\\"bar\\":true,\\"indexRefName\\":\\"kibanaSavedObjectMeta.searchSourceJSON.index\\"}",
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
