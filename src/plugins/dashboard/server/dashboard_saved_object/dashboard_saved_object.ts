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
import {
  createDashboardSavedObjectTypeMigrations,
  DashboardSavedObjectTypeMigrationsDeps,
} from './migrations/dashboard_saved_object_migrations';

export const createDashboardSavedObjectType = ({
  migrationDeps,
}: {
  migrationDeps: DashboardSavedObjectTypeMigrationsDeps;
}): SavedObjectsType => ({
  name: 'dashboard',
  indexPattern: ANALYTICS_SAVED_OBJECT_INDEX,
  hidden: false,
  namespaceType: 'multiple-isolated',
  convertToMultiNamespaceTypeVersion: '8.0.0',
  management: {
    icon: 'dashboardApp',
    defaultSearchField: 'title',
    importableAndExportable: true,
    getTitle(obj) {
      return obj.attributes.title;
    },
    getInAppUrl(obj) {
      return {
        path: `/app/dashboards#/view/${encodeURIComponent(obj.id)}`,
        uiCapabilitiesPath: 'dashboard.show',
      };
    },
  },
  mappings: {
    properties: {
      description: { type: 'text' },
      hits: { type: 'integer', index: false, doc_values: false },
      kibanaSavedObjectMeta: {
        properties: { searchSourceJSON: { type: 'text', index: false } },
      },
      optionsJSON: { type: 'text', index: false },
      panelsJSON: { type: 'text', index: false },
      refreshInterval: {
        properties: {
          display: { type: 'keyword', index: false, doc_values: false },
          pause: { type: 'boolean', index: false, doc_values: false },
          section: { type: 'integer', index: false, doc_values: false },
          value: { type: 'integer', index: false, doc_values: false },
        },
      },
      controlGroupInput: {
        properties: {
          controlStyle: { type: 'keyword', index: false, doc_values: false },
          chainingSystem: { type: 'keyword', index: false, doc_values: false },
          panelsJSON: { type: 'text', index: false },
          ignoreParentSettingsJSON: { type: 'text', index: false },
        },
      },
      timeFrom: { type: 'keyword', index: false, doc_values: false },
      timeRestore: { type: 'boolean', index: false, doc_values: false },
      timeTo: { type: 'keyword', index: false, doc_values: false },
      title: { type: 'text' },
      version: { type: 'integer' },
    },
  },
  schemas: {
    '8.9.0': schema.object({
      // General
      title: schema.string(),
      description: schema.string({ defaultValue: '' }),

      // Search
      kibanaSavedObjectMeta: schema.object({
        searchSourceJSON: schema.maybe(schema.string()),
      }),

      // Time
      timeRestore: schema.maybe(schema.boolean()),
      timeFrom: schema.maybe(schema.string()),
      timeTo: schema.maybe(schema.string()),
      refreshInterval: schema.maybe(
        schema.object({
          pause: schema.boolean(),
          value: schema.number(),
          display: schema.maybe(schema.string()),
          section: schema.maybe(schema.number()),
        })
      ),

      // Dashboard Content
      controlGroupInput: schema.maybe(
        schema.object({
          panelsJSON: schema.maybe(schema.string()),
          controlStyle: schema.maybe(schema.string()),
          chainingSystem: schema.maybe(schema.string()),
          ignoreParentSettingsJSON: schema.maybe(schema.string()),
        })
      ),
      panelsJSON: schema.string({ defaultValue: '[]' }),
      optionsJSON: schema.string({ defaultValue: '{}' }),

      // Legacy
      hits: schema.maybe(schema.number()),
      version: schema.maybe(schema.number()),
    }),
  },
  migrations: () => createDashboardSavedObjectTypeMigrations(migrationDeps),
});
