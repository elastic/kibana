/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { ANALYTICS_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { SavedObjectsType } from '@kbn/core/server';
import { MigrateFunctionsObject } from '@kbn/kibana-utils-plugin/common';
import { VIEW_MODE } from '../../common';
import { getAllMigrations } from './search_migrations';

export function getSavedSearchObjectType(
  getSearchSourceMigrations: () => MigrateFunctionsObject
): SavedObjectsType {
  return {
    name: 'search',
    indexPattern: ANALYTICS_SAVED_OBJECT_INDEX,
    hidden: false,
    namespaceType: 'multiple-isolated',
    convertToMultiNamespaceTypeVersion: '8.0.0',
    management: {
      icon: 'discoverApp',
      defaultSearchField: 'title',
      importableAndExportable: true,
      getTitle(obj) {
        return obj.attributes.title;
      },
      getInAppUrl(obj) {
        return {
          path: `/app/discover#/view/${encodeURIComponent(obj.id)}`,
          uiCapabilitiesPath: 'discover.show',
        };
      },
    },
    mappings: {
      dynamic: false,
      properties: {
        title: { type: 'text' },
        description: { type: 'text' },
      },
    },
    schemas: {
      '8.8.0': schema.object({
        // General
        title: schema.string(),
        description: schema.string({ defaultValue: '' }),

        // Data grid
        columns: schema.arrayOf(schema.string(), { defaultValue: [] }),
        sort: schema.oneOf(
          [
            schema.arrayOf(schema.arrayOf(schema.string(), { minSize: 2, maxSize: 2 })),
            schema.arrayOf(schema.string(), { minSize: 2, maxSize: 2 }),
          ],
          { defaultValue: [] }
        ),
        grid: schema.object(
          {
            columns: schema.maybe(
              schema.recordOf(
                schema.string(),
                schema.object({
                  width: schema.maybe(schema.number()),
                })
              )
            ),
          },
          { defaultValue: {} }
        ),
        rowHeight: schema.maybe(schema.number()),
        rowsPerPage: schema.maybe(schema.number()),

        // Chart
        hideChart: schema.boolean({ defaultValue: false }),
        breakdownField: schema.maybe(schema.string()),

        // Search
        kibanaSavedObjectMeta: schema.object({
          searchSourceJSON: schema.string(),
        }),
        isTextBasedQuery: schema.boolean({ defaultValue: false }),
        usesAdHocDataView: schema.maybe(schema.boolean()),

        // Time
        timeRestore: schema.maybe(schema.boolean()),
        timeRange: schema.maybe(
          schema.object({
            from: schema.string(),
            to: schema.string(),
          })
        ),
        refreshInterval: schema.maybe(
          schema.object({
            pause: schema.boolean(),
            value: schema.number(),
          })
        ),

        // Display
        viewMode: schema.maybe(
          schema.oneOf([
            schema.literal(VIEW_MODE.DOCUMENT_LEVEL),
            schema.literal(VIEW_MODE.AGGREGATED_LEVEL),
          ])
        ),
        hideAggregatedPreview: schema.maybe(schema.boolean()),

        // Legacy
        hits: schema.maybe(schema.number()),
        version: schema.maybe(schema.number()),
      }),
    },
    migrations: () => getAllMigrations(getSearchSourceMigrations()),
  };
}
