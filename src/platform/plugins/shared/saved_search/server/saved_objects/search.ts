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

  // Sort model version schemas from latest to oldest,
  // since the guesser tries to match the latest valid schema
  const modelVersionsArray = Object.entries(modelVersions)
    .toSorted(([a], [b]) => Number(b) - Number(a))
    .map(([version, { schemas }]) => ({
      version: Number(version),
      schema: schemas?.create,
    }));

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
    typeVersionGuesser: (document) => {
      // Try to match the document against each model version schema,
      // starting from the latest one and working backwards
      for (const { version, schema } of modelVersionsArray) {
        if (schema) {
          try {
            schema.validate(document.attributes);
            return version;
          } catch {
            // Schema validation failed, try the next one
          }
        }
      }

      // Return the latest version if none of the schemas matched
      return modelVersionsArray[0].version;
    },
  };
}
