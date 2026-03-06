/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ANALYTICS_SAVED_OBJECT_INDEX,
  type SavedObjectsModelVersionMap,
} from '@kbn/core-saved-objects-server';
import type { SavedObjectsType } from '@kbn/core/server';
import type { MigrateFunctionsObject } from '@kbn/kibana-utils-plugin/common';
import { get } from 'lodash';
import { extractTabsBackfillFnV12 } from '../../common/service/extract_tabs';
import { getAllMigrations } from './search_migrations';
import { SavedSearchTypeDisplayName } from '../../common/constants';
import {
  SCHEMA_SEARCH_V8_8_0,
  LEGACY_MODEL_VERSIONS,
  LEGACY_MODEL_REMOVED_ATTRIBUTES,
} from './schema_legacy';
import { SCHEMA_DISCOVER_SESSION_V12 } from './schema';

export function getSavedSearchObjectType(
  getSearchSourceMigrations: () => MigrateFunctionsObject
): SavedObjectsType {
  const modelVersions: SavedObjectsModelVersionMap = {
    ...LEGACY_MODEL_VERSIONS,
    12: {
      changes: [
        {
          type: 'data_backfill',
          backfillFn: extractTabsBackfillFnV12,
        },
        {
          type: 'data_removal',
          removedAttributePaths: LEGACY_MODEL_REMOVED_ATTRIBUTES,
        },
      ],
      schemas: {
        forwardCompatibility: SCHEMA_DISCOVER_SESSION_V12.extends({}, { unknowns: 'ignore' }),
        create: SCHEMA_DISCOVER_SESSION_V12,
      },
    },
  };

  const latestModelVersion = Math.max(...Object.keys(modelVersions).map(Number));

  return {
    name: 'search',
    indexPattern: ANALYTICS_SAVED_OBJECT_INDEX,
    hidden: false,
    namespaceType: 'multiple-isolated',
    convertToMultiNamespaceTypeVersion: '8.0.0',
    management: {
      icon: 'discoverApp',
      defaultSearchField: 'title',
      displayName: SavedSearchTypeDisplayName,
      importableAndExportable: true,
      getTitle(obj) {
        return obj.attributes.title;
      },
      getInAppUrl(obj) {
        return {
          path: `/app/discover#/view/${encodeURIComponent(obj.id)}`,
          uiCapabilitiesPath: 'discover_v2.show',
        };
      },
    },
    modelVersions,
    mappings: {
      dynamic: false,
      properties: {
        title: { type: 'text' },
        description: { type: 'text' },
      },
    },
    schemas: {
      '8.8.0': SCHEMA_SEARCH_V8_8_0,
    },
    migrations: () => getAllMigrations(getSearchSourceMigrations()),
    typeVersionGuesser: (doc) => {
      return Array.isArray(get(doc.attributes, 'tabs')) ? latestModelVersion : 11;
    },
  };
}
