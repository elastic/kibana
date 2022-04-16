/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { migrateMatchAllQuery } from './migrate_match_all_query';
import { SavedObjectMigrationContext, SavedObjectMigrationFn } from '@kbn/core/server';

const savedObjectMigrationContext = null as unknown as SavedObjectMigrationContext;

describe('migrate match_all query', () => {
  test('should migrate obsolete match_all query', () => {
    const migratedDoc = migrateMatchAllQuery(
      {
        attributes: {
          kibanaSavedObjectMeta: {
            searchSourceJSON: JSON.stringify({
              query: {
                match_all: {},
              },
            }),
          },
        },
      } as Parameters<SavedObjectMigrationFn>[0],
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
    const migratedDoc = migrateMatchAllQuery(
      {
        attributes: {
          kibanaSavedObjectMeta: 'kibanaSavedObjectMeta',
        },
      } as Parameters<SavedObjectMigrationFn>[0],
      savedObjectMigrationContext
    );

    expect(migratedDoc).toEqual({
      attributes: {
        kibanaSavedObjectMeta: 'kibanaSavedObjectMeta',
      },
    });
  });
});
