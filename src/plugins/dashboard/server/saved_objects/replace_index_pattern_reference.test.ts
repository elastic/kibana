/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { SavedObjectMigrationContext, SavedObjectMigrationFn } from '@kbn/core/server';

import { replaceIndexPatternReference } from './replace_index_pattern_reference';

describe('replaceIndexPatternReference', () => {
  const savedObjectMigrationContext = null as unknown as SavedObjectMigrationContext;

  test('should replace index_pattern to index-pattern', () => {
    const migratedDoc = replaceIndexPatternReference(
      {
        references: [
          {
            name: 'name',
            type: 'index_pattern',
          },
        ],
      } as Parameters<SavedObjectMigrationFn>[0],
      savedObjectMigrationContext
    );

    expect(migratedDoc).toMatchInlineSnapshot(`
      Object {
        "references": Array [
          Object {
            "name": "name",
            "type": "index-pattern",
          },
        ],
      }
    `);
  });
});
