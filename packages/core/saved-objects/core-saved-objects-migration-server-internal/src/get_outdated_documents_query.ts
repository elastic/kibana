/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { SavedObjectsMigrationVersion } from '@kbn/core-saved-objects-common';

export interface OutdatedDocumentsQueryParams {
  coreMigrationVersionPerType: SavedObjectsMigrationVersion;
  migrationVersionPerType: SavedObjectsMigrationVersion;
}

export function getOutdatedDocumentsQuery({
  coreMigrationVersionPerType,
  migrationVersionPerType,
}: OutdatedDocumentsQueryParams): QueryDslQueryContainer {
  const types = [
    ...new Set([
      ...Object.keys(coreMigrationVersionPerType),
      ...Object.keys(migrationVersionPerType),
    ]).values(),
  ];
  return {
    bool: {
      should: types.map((type) => ({
        bool: {
          must: [
            { term: { type } },
            {
              bool: {
                should: [
                  ...(coreMigrationVersionPerType[type]
                    ? [
                        {
                          range: {
                            coreMigrationVersion: { lt: coreMigrationVersionPerType[type] },
                          },
                        },
                      ]
                    : []),
                  ...(migrationVersionPerType[type]
                    ? [
                        {
                          bool: {
                            must_not: [
                              { exists: { field: 'typeMigrationVersion' } },
                              { exists: { field: `migrationVersion.${type}` } },
                            ],
                          },
                        },
                        {
                          bool: {
                            must: { exists: { field: 'migrationVersion' } },
                            must_not: {
                              term: { [`migrationVersion.${type}`]: migrationVersionPerType[type] },
                            },
                          },
                        },
                        {
                          range: { typeMigrationVersion: { lt: migrationVersionPerType[type] } },
                        },
                      ]
                    : []),
                ],
              },
            },
          ],
        },
      })),
    },
  };
}
