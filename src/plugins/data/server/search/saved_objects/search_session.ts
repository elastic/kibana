/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectsType } from '@kbn/core/server';
import { SEARCH_SESSION_TYPE } from '../../../common';
import { searchSessionSavedObjectMigrations } from './search_session_migration';

export const searchSessionSavedObjectType: SavedObjectsType = {
  name: SEARCH_SESSION_TYPE,
  namespaceType: 'single',
  hidden: true,
  mappings: {
    properties: {
      sessionId: {
        type: 'keyword',
      },
      name: {
        type: 'keyword',
      },
      created: {
        type: 'date',
      },
      expires: {
        type: 'date',
      },
      appId: {
        type: 'keyword',
      },
      locatorId: {
        type: 'keyword',
      },
      initialState: {
        dynamic: false,
        properties: {},
      },
      restoreState: {
        dynamic: false,
        properties: {},
      },
      idMapping: {
        dynamic: false,
        properties: {},
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
      version: {
        type: 'keyword',
      },
      isCanceled: {
        type: 'boolean',
      },
    },
  },
  migrations: searchSessionSavedObjectMigrations,
};
