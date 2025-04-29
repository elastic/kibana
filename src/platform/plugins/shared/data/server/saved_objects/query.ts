/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ANALYTICS_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { SavedObjectsType } from '@kbn/core/server';
import { savedQueryMigrations } from './migrations/query';
import {
  SCHEMA_QUERY_V8_8_0,
  SCHEMA_QUERY_MODEL_VERSION_1,
  SCHEMA_QUERY_MODEL_VERSION_2,
} from './schemas/query';

export const querySavedObjectType: SavedObjectsType = {
  name: 'query',
  indexPattern: ANALYTICS_SAVED_OBJECT_INDEX,
  hidden: false,
  namespaceType: 'multiple',
  convertToMultiNamespaceTypeVersion: '8.0.0',
  management: {
    icon: 'search',
    defaultSearchField: 'title',
    importableAndExportable: true,
    getTitle(obj) {
      return obj.attributes.title;
    },
    getInAppUrl(obj) {
      return {
        path: `/app/discover#/?_a=(savedQuery:'${encodeURIComponent(obj.id)}')`,
        uiCapabilitiesPath: 'discover_v2.show',
      };
    },
  },
  modelVersions: {
    1: {
      changes: [],
      schemas: {
        forwardCompatibility: SCHEMA_QUERY_MODEL_VERSION_1.extends({}, { unknowns: 'ignore' }),
        create: SCHEMA_QUERY_MODEL_VERSION_1,
      },
    },
    2: {
      changes: [
        {
          type: 'mappings_addition',
          addedMappings: {
            titleKeyword: { type: 'keyword' },
          },
        },
        {
          type: 'data_backfill',
          backfillFn: (doc) => {
            return {
              attributes: { ...doc.attributes, titleKeyword: doc.attributes.title },
            };
          },
        },
      ],
      schemas: {
        forwardCompatibility: SCHEMA_QUERY_MODEL_VERSION_2.extends({}, { unknowns: 'ignore' }),
        create: SCHEMA_QUERY_MODEL_VERSION_2,
      },
    },
  },
  mappings: {
    dynamic: false,
    properties: {
      title: { type: 'text' },
      titleKeyword: { type: 'keyword' },
      description: { type: 'text' },
    },
  },
  migrations: savedQueryMigrations,
  schemas: {
    '8.8.0': SCHEMA_QUERY_V8_8_0,
  },
};
