/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectMigrationContext, SavedObjectUnsanitizedDoc } from '@kbn/core/server';
import { getAllMigrations, searchMigrations } from './search_migrations';

const savedObjectMigrationContext = null as unknown as SavedObjectMigrationContext;

const testMigrateMatchAllQuery = (migrationFn: Function) => {
  it('should migrate obsolete match_all query', () => {
    const migratedDoc = migrationFn(
      {
        type: 'search',
        attributes: {
          kibanaSavedObjectMeta: {
            searchSourceJSON: JSON.stringify({
              query: {
                match_all: {},
              },
            }),
          },
        },
      },
      savedObjectMigrationContext
    );
    const migratedSearchSource = JSON.parse(
      migratedDoc.attributes.kibanaSavedObjectMeta.searchSourceJSON
    );

    expect(migratedSearchSource).toEqual({
      query: {
        query: '',
        language: 'kuery',
      },
    });
  });

  it('should return original doc if searchSourceJSON cannot be parsed', () => {
    const migratedDoc = migrationFn(
      {
        type: 'search',
        attributes: {
          kibanaSavedObjectMeta: 'kibanaSavedObjectMeta',
        },
      },
      savedObjectMigrationContext
    );

    expect(migratedDoc).toEqual({
      type: 'search',
      attributes: {
        kibanaSavedObjectMeta: 'kibanaSavedObjectMeta',
      },
    });
  });
};

describe('migration search', () => {
  describe('6.7.2', () => {
    const migrationFn = searchMigrations['6.7.2'];

    describe('migrateMatchAllQuery', () => {
      testMigrateMatchAllQuery(migrationFn);
    });
  });

  describe('7.0.0', () => {
    const migrationFn = searchMigrations['7.0.0'];

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
      const migratedDoc = migrationFn(doc, savedObjectMigrationContext);

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
      const migratedDoc = migrationFn(doc, savedObjectMigrationContext);

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
      const migratedDoc = migrationFn(doc, savedObjectMigrationContext);

      expect(migratedDoc).toMatchInlineSnapshot(`
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
      const migratedDoc = migrationFn(doc, savedObjectMigrationContext);

      expect(migratedDoc).toMatchInlineSnapshot(`
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

    test('skips error when "index" and "filter" is missing from searchSourceJSON', () => {
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
      const migratedDoc = migrationFn(doc, savedObjectMigrationContext);

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
      const migratedDoc = migrationFn(doc, savedObjectMigrationContext);

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

    test('extracts index patterns from filter', () => {
      const doc = {
        id: '123',
        type: 'search',
        attributes: {
          foo: true,
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
        },
      };
      const migratedDoc = migrationFn(doc, savedObjectMigrationContext);

      expect(migratedDoc).toMatchInlineSnapshot(`
Object {
  "attributes": Object {
    "foo": true,
    "kibanaSavedObjectMeta": Object {
      "searchSourceJSON": "{\\"bar\\":true,\\"filter\\":[{\\"meta\\":{\\"foo\\":true,\\"indexRefName\\":\\"kibanaSavedObjectMeta.searchSourceJSON.filter[0].meta.index\\"}}]}",
    },
  },
  "id": "123",
  "references": Array [
    Object {
      "id": "my-index",
      "name": "kibanaSavedObjectMeta.searchSourceJSON.filter[0].meta.index",
      "type": "index-pattern",
    },
  ],
  "type": "search",
}
`);
    });
  });

  describe('7.4.0', function () {
    const migrationFn = searchMigrations['7.4.0'];

    test('transforms one dimensional sort arrays into two dimensional arrays', () => {
      const doc = {
        id: '123',
        type: 'search',
        attributes: {
          sort: ['bytes', 'desc'],
        },
      };

      const expected = {
        id: '123',
        type: 'search',
        attributes: {
          sort: [['bytes', 'desc']],
        },
      };

      const migratedDoc = migrationFn(doc, savedObjectMigrationContext);

      expect(migratedDoc).toEqual(expected);
    });

    test("doesn't modify search docs that already have two dimensional sort arrays", () => {
      const doc = {
        id: '123',
        type: 'search',
        attributes: {
          sort: [['bytes', 'desc']],
        },
      };

      const migratedDoc = migrationFn(doc, savedObjectMigrationContext);

      expect(migratedDoc).toEqual(doc);
    });

    test("doesn't modify search docs that have no sort array", () => {
      const doc = {
        id: '123',
        type: 'search',
        attributes: {},
      };

      const migratedDoc = migrationFn(doc, savedObjectMigrationContext);

      expect(migratedDoc).toEqual(doc);
    });
  });

  describe('7.9.3', () => {
    const migrationFn = searchMigrations['7.9.3'];

    describe('migrateMatchAllQuery', () => {
      testMigrateMatchAllQuery(migrationFn);
    });
  });
  it('should apply search source migrations within saved search', () => {
    const savedSearch = {
      attributes: {
        kibanaSavedObjectMeta: {
          searchSourceJSON: JSON.stringify({
            some: 'prop',
            migrated: false,
          }),
        },
      },
    } as SavedObjectUnsanitizedDoc;

    const versionToTest = '9.1.1';
    const migrations = getAllMigrations({
      // providing a function for search source migration that's just setting `migrated` to true
      [versionToTest]: (state) => ({ ...state, migrated: true }),
    });

    expect(migrations[versionToTest](savedSearch, {} as SavedObjectMigrationContext)).toEqual({
      attributes: {
        kibanaSavedObjectMeta: {
          searchSourceJSON: JSON.stringify({
            some: 'prop',
            migrated: true,
          }),
        },
      },
    });
  });
});
