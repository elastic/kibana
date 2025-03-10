/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { ANALYTICS_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { SavedObjectsType } from '@kbn/core/server';
import { SEARCH_SESSION_TYPE } from '../../../common';
import { searchSessionSavedObjectMigrations } from './search_session_migration';

export const searchSessionSavedObjectType: SavedObjectsType = {
  name: SEARCH_SESSION_TYPE,
  indexPattern: ANALYTICS_SAVED_OBJECT_INDEX,
  namespaceType: 'single',
  hidden: true,
  mappings: {
    dynamic: false,
    properties: {
      sessionId: {
        type: 'keyword',
      },
      created: {
        type: 'date',
      },
      realmType: {
        type: 'keyword',
      },
      realmName: {
        type: 'keyword',
      },
      username: {
        type: 'keyword',
      },
    },
  },
  schemas: {
    '8.8.0': schema.object({
      sessionId: schema.string(),
      name: schema.maybe(schema.string()),
      created: schema.string(),
      expires: schema.string(),
      appId: schema.maybe(schema.string()),
      locatorId: schema.maybe(schema.string()),
      initialState: schema.maybe(schema.object({}, { unknowns: 'allow' })),
      restoreState: schema.maybe(schema.object({}, { unknowns: 'allow' })),
      idMapping: schema.mapOf(
        schema.string(),
        schema.object({
          id: schema.string(),
          strategy: schema.string(),
        })
      ),
      realmType: schema.maybe(schema.string()),
      realmName: schema.maybe(schema.string()),
      username: schema.maybe(schema.string()),
      version: schema.string(),
      isCanceled: schema.maybe(schema.boolean()),
    }),
  },
  migrations: searchSessionSavedObjectMigrations,
  excludeOnUpgrade: async () => {
    return {
      bool: {
        must: [
          { term: { type: SEARCH_SESSION_TYPE } },
          { match: { 'search-session.persisted': false } },
        ],
      },
    };
  },
};
