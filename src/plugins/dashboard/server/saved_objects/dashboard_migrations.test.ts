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

import { SavedObjectUnsanitizedDoc } from 'kibana/server';
import { savedObjectsServiceMock } from '../../../../core/server/mocks';
import { dashboardSavedObjectTypeMigrations as migrations } from './dashboard_migrations';

const contextMock = savedObjectsServiceMock.createMigrationContext();

describe('dashboard', () => {
  describe('7.0.0', () => {
    const migration = migrations['7.0.0'];

    test('skips error on empty object', () => {
      expect(migration({} as SavedObjectUnsanitizedDoc, contextMock)).toMatchInlineSnapshot(`
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
      const migratedDoc = migration(doc, contextMock);
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
      const migratedDoc = migration(doc, contextMock);
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
      expect(migration(doc, contextMock)).toMatchInlineSnapshot(`
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
      expect(migration(doc, contextMock)).toMatchInlineSnapshot(`
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

    test('skips error when "index" and "filter" is missing from searchSourceJSON', () => {
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
      const migratedDoc = migration(doc, contextMock);
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
      const migratedDoc = migration(doc, contextMock);
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

    test('extracts index patterns from filter', () => {
      const doc = {
        id: '1',
        type: 'dashboard',
        attributes: {
          kibanaSavedObjectMeta: {
            searchSourceJSON: JSON.stringify({
              bar: true,
              filter: [
                {
                  meta: {
                    foo: true,
                    index: 'my-index',
                  },
                },
              ],
            }),
          },
          panelsJSON:
            '[{"id":"1","type":"visualization","foo":true},{"id":"2","type":"visualization","bar":true}]',
        },
      };
      const migratedDoc = migration(doc, contextMock);

      expect(migratedDoc).toMatchInlineSnapshot(`
Object {
  "attributes": Object {
    "kibanaSavedObjectMeta": Object {
      "searchSourceJSON": "{\\"bar\\":true,\\"filter\\":[{\\"meta\\":{\\"foo\\":true,\\"indexRefName\\":\\"kibanaSavedObjectMeta.searchSourceJSON.filter[0].meta.index\\"}}]}",
    },
    "panelsJSON": "[{\\"foo\\":true,\\"panelRefName\\":\\"panel_0\\"},{\\"bar\\":true,\\"panelRefName\\":\\"panel_1\\"}]",
  },
  "id": "1",
  "references": Array [
    Object {
      "id": "my-index",
      "name": "kibanaSavedObjectMeta.searchSourceJSON.filter[0].meta.index",
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
      } as SavedObjectUnsanitizedDoc;
      expect(migration(doc, contextMock)).toMatchInlineSnapshot(`
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
      } as SavedObjectUnsanitizedDoc;
      expect(migration(doc, contextMock)).toMatchInlineSnapshot(`
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
      } as SavedObjectUnsanitizedDoc;
      expect(migration(doc, contextMock)).toMatchInlineSnapshot(`
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
      } as SavedObjectUnsanitizedDoc;
      expect(migration(doc, contextMock)).toMatchInlineSnapshot(`
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
      } as SavedObjectUnsanitizedDoc;
      expect(migration(doc, contextMock)).toMatchInlineSnapshot(`
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
      } as SavedObjectUnsanitizedDoc;
      const migratedDoc = migration(doc, contextMock);
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
