/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { SavedObjectUnsanitizedDoc } from 'kibana/server';
import { savedObjectsServiceMock } from '../../../../core/server/mocks';
import { createEmbeddableSetupMock } from '../../../embeddable/server/mocks';
import { createDashboardSavedObjectTypeMigrations } from './dashboard_migrations';
import { DashboardDoc730ToLatest } from '../../common';

const embeddableSetupMock = createEmbeddableSetupMock();
const migrations = createDashboardSavedObjectTypeMigrations({
  embeddable: embeddableSetupMock,
});

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

  describe('7.11.0 - embeddable persistable state extraction', () => {
    const migration = migrations['7.11.0'];
    const doc: DashboardDoc730ToLatest = {
      attributes: {
        description: '',
        kibanaSavedObjectMeta: {
          searchSourceJSON:
            '{"query":{"language":"kuery","query":""},"filter":[{"query":{"match_phrase":{"machine.os.keyword":"osx"}},"$state":{"store":"appState"},"meta":{"type":"phrase","key":"machine.os.keyword","params":{"query":"osx"},"disabled":false,"negate":false,"alias":null,"indexRefName":"kibanaSavedObjectMeta.searchSourceJSON.filter[0].meta.index"}}]}',
        },
        optionsJSON: '{"useMargins":true,"hidePanelTitles":false}',
        panelsJSON:
          '[{"version":"7.9.3","gridData":{"x":0,"y":0,"w":24,"h":15,"i":"82fa0882-9f9e-476a-bbb9-03555e5ced91"},"panelIndex":"82fa0882-9f9e-476a-bbb9-03555e5ced91","embeddableConfig":{"enhancements":{"dynamicActions":{"events":[]}}},"panelRefName":"panel_0"}]',
        timeRestore: false,
        title: 'Dashboard A',
        version: 1,
      },
      id: '376e6260-1f5e-11eb-91aa-7b6d5f8a61d6',
      references: [
        {
          id: '90943e30-9a47-11e8-b64d-95841ca0b247',
          name: 'kibanaSavedObjectMeta.searchSourceJSON.filter[0].meta.index',
          type: 'index-pattern',
        },
        { id: '14e2e710-4258-11e8-b3aa-73fdaf54bfc9', name: 'panel_0', type: 'visualization' },
      ],
      type: 'dashboard',
    };

    test('should migrate 7.3.0 doc without embeddable state to extract', () => {
      const newDoc = migration(doc, contextMock);
      expect(newDoc).toEqual(doc);
    });

    test('should migrate 7.3.0 doc and extract embeddable state', () => {
      embeddableSetupMock.extract.mockImplementationOnce((state) => ({
        state: { ...state, __extracted: true },
        references: [{ id: '__new', name: '__newRefName', type: '__newType' }],
      }));

      const newDoc = migration(doc, contextMock);
      expect(newDoc).not.toEqual(doc);
      expect(newDoc.references).toHaveLength(doc.references.length + 1);
      expect(JSON.parse(newDoc.attributes.panelsJSON)[0].embeddableConfig.__extracted).toBe(true);
    });
  });
});
