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

describe('visualization', () => {
  describe('7.0.0', () => {
    const migration = migrations.visualization['7.0.0'];

    test('does not throw error on empty object', () => {
      const migratedDoc = migration({});
      expect(migratedDoc).toMatchInlineSnapshot(`
Object {
  "references": Array [],
}
`);
    });

    test('skips errors when searchSourceJSON is null', () => {
      const doc = {
        id: '1',
        type: 'visualization',
        attributes: {
          kibanaSavedObjectMeta: {
            searchSourceJSON: null,
          },
          savedSearchId: '123',
        },
      };
      const migratedDoc = migration(doc);
      expect(migratedDoc).toMatchInlineSnapshot(`
Object {
  "attributes": Object {
    "kibanaSavedObjectMeta": Object {
      "searchSourceJSON": null,
    },
    "savedSearchId": "search_0",
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

    test('skips errors when searchSourceJSON is undefined', () => {
      const doc = {
        id: '1',
        type: 'visualization',
        attributes: {
          kibanaSavedObjectMeta: {
            searchSourceJSON: undefined,
          },
          savedSearchId: '123',
        },
      };
      const migratedDoc = migration(doc);
      expect(migratedDoc).toMatchInlineSnapshot(`
Object {
  "attributes": Object {
    "kibanaSavedObjectMeta": Object {
      "searchSourceJSON": undefined,
    },
    "savedSearchId": "search_0",
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

    test('throw error when searchSourceJSON is not a string', () => {
      const doc = {
        id: '1',
        type: 'visualization',
        attributes: {
          kibanaSavedObjectMeta: {
            searchSourceJSON: 123,
          },
          savedSearchId: '123',
        },
      };
      expect(() => migration(doc)).toThrowErrorMatchingInlineSnapshot(
        `"searchSourceJSON is not a string on visualization \\"1\\""`
      );
    });

    test('skips error when "index" is missing from searchSourceJSON', () => {
      const doc = {
        id: '1',
        type: 'visualization',
        attributes: {
          kibanaSavedObjectMeta: {
            searchSourceJSON: JSON.stringify({ bar: true }),
          },
          savedSearchId: '123',
        },
      };
      const migratedDoc = migration(doc);
      expect(migratedDoc).toMatchInlineSnapshot(`
Object {
  "attributes": Object {
    "kibanaSavedObjectMeta": Object {
      "searchSourceJSON": "{\\"bar\\":true}",
    },
    "savedSearchId": "search_0",
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

    test('extracts "index" attribute from doc', () => {
      const doc = {
        id: '1',
        type: 'visualization',
        attributes: {
          kibanaSavedObjectMeta: {
            searchSourceJSON: JSON.stringify({ bar: true, index: 'pattern*' }),
          },
          savedSearchId: '123',
        },
      };
      const migratedDoc = migration(doc);
      expect(migratedDoc).toMatchInlineSnapshot(`
Object {
  "attributes": Object {
    "kibanaSavedObjectMeta": Object {
      "searchSourceJSON": "{\\"bar\\":true,\\"index\\":\\"kibanaSavedObjectMeta.searchSourceJSON.index\\"}",
    },
    "savedSearchId": "search_0",
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

    test('extract saved search id from doc', () => {
      const doc = {
        id: '1',
        attributes: {
          kibanaSavedObjectMeta: {
            searchSourceJSON: '{}',
          },
          savedSearchId: '123',
        },
      };
      const migratedDoc = migration(doc);
      expect(migratedDoc).toMatchInlineSnapshot(`
Object {
  "attributes": Object {
    "kibanaSavedObjectMeta": Object {
      "searchSourceJSON": "{}",
    },
    "savedSearchId": "search_0",
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
  });
});

describe('dashboard', () => {
  describe('7.0.0', () => {
    const migration = migrations.dashboard['7.0.0'];

    test('throw error on empty object', () => {
      expect(() => migration({})).toThrowErrorMatchingInlineSnapshot(
        `"panelsJSON is missing on dashboard \\"undefined\\""`
      );
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
    "panelsJSON": "[{\\"foo\\":true,\\"panelRef\\":\\"panel_0\\"},{\\"bar\\":true,\\"panelRef\\":\\"panel_1\\"}]",
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
    "panelsJSON": "[{\\"foo\\":true,\\"panelRef\\":\\"panel_0\\"},{\\"bar\\":true,\\"panelRef\\":\\"panel_1\\"}]",
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

    test('throw error when searchSourceJSON is not a string', () => {
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
      expect(() => migration(doc)).toThrowErrorMatchingInlineSnapshot(
        `"searchSourceJSON is not a string on dashboard \\"1\\""`
      );
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
    "panelsJSON": "[{\\"foo\\":true,\\"panelRef\\":\\"panel_0\\"},{\\"bar\\":true,\\"panelRef\\":\\"panel_1\\"}]",
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
      "searchSourceJSON": "{\\"bar\\":true,\\"index\\":\\"kibanaSavedObjectMeta.searchSourceJSON.index\\"}",
    },
    "panelsJSON": "[{\\"foo\\":true,\\"panelRef\\":\\"panel_0\\"},{\\"bar\\":true,\\"panelRef\\":\\"panel_1\\"}]",
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

    test('throw error when panelsJSON is not a string', () => {
      const doc = {
        id: '1',
        attributes: {
          panelsJSON: 123,
        },
      };
      expect(() => migration(doc)).toThrowErrorMatchingInlineSnapshot(
        `"panelsJSON is not a string on dashboard \\"1\\""`
      );
    });

    test('throw error when panelsJSON is not valid JSON', () => {
      const doc = {
        id: '1',
        attributes: {
          panelsJSON: '{123abc}',
        },
      };
      expect(() => migration(doc)).toThrowErrorMatchingInlineSnapshot(
        `"Failed to parse panelsJSON: \\"{123abc}\\" because \\"Unexpected number in JSON at position 1\\" on dashboard \\"1\\""`
      );
    });

    test('throw error when a panel is missing "type" attribute', () => {
      const doc = {
        id: '1',
        attributes: {
          panelsJSON: '[{"id":"123"}]',
        },
      };
      expect(() => migration(doc)).toThrowErrorMatchingInlineSnapshot(
        `"\\"type\\" attribute is missing from panel \\"0\\" on dashboard \\"1\\""`
      );
    });

    test('throw error when a panel is missing "id" attribute', () => {
      const doc = {
        id: '1',
        attributes: {
          panelsJSON: '[{"type":"visualization"}]',
        },
      };
      expect(() => migration(doc)).toThrowErrorMatchingInlineSnapshot(
        `"\\"id\\" attribute is missing from panel \\"0\\" on dashboard \\"1\\""`
      );
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
    "panelsJSON": "[{\\"foo\\":true,\\"panelRef\\":\\"panel_0\\"},{\\"bar\\":true,\\"panelRef\\":\\"panel_1\\"}]",
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
