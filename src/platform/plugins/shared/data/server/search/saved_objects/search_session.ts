/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ANALYTICS_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import type { SavedObjectsType } from '@kbn/core/server';
import { SEARCH_SESSION_TYPE } from '../../../common';
import { searchSessionSavedObjectMigrations } from './search_session_migration';
import {
  SCHEMA_SEARCH_SESSION_V1,
  SCHEMA_SEARCH_SESSION_V2,
  SCHEMA_SEARCH_SESSION_V8_8_O,
} from './search_session_schema';

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
      status: {
        type: 'keyword',
      },
    },
  },
  modelVersions: {
    1: {
      changes: [],
      schemas: {
        forwardCompatibility: SCHEMA_SEARCH_SESSION_V1.extends({}, { unknowns: 'ignore' }),
        create: SCHEMA_SEARCH_SESSION_V1,
      },
    },
    2: {
      changes: [
        {
          type: 'mappings_addition',
          addedMappings: {
            status: { type: 'keyword' },
          },
        },
      ],
      schemas: {
        forwardCompatibility: SCHEMA_SEARCH_SESSION_V2.extends({}, { unknowns: 'ignore' }),
        create: SCHEMA_SEARCH_SESSION_V2,
      },
    },
  },
  schemas: {
    '8.8.0': SCHEMA_SEARCH_SESSION_V8_8_O,
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
