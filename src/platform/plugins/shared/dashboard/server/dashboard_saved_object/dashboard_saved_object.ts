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

import { dashboardAttributesSchema as dashboardAttributesSchemaV1 } from './schema/v1';
import { dashboardAttributesSchema as dashboardAttributesSchemaV2 } from './schema/v2';
import {
  createDashboardSavedObjectTypeMigrations,
  DashboardSavedObjectTypeMigrationsDeps,
} from './migrations/dashboard_saved_object_migrations';

export const DASHBOARD_SAVED_OBJECT_TYPE = 'dashboard';

export const createDashboardSavedObjectType = ({
  migrationDeps,
}: {
  migrationDeps: DashboardSavedObjectTypeMigrationsDeps;
}): SavedObjectsType => ({
  name: DASHBOARD_SAVED_OBJECT_TYPE,
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
        uiCapabilitiesPath: 'dashboard_v2.show',
      };
    },
  },
  modelVersions: {
    1: {
      changes: [],
      schemas: {
        forwardCompatibility: dashboardAttributesSchemaV1.extends({}, { unknowns: 'ignore' }),
        create: dashboardAttributesSchemaV1,
      },
    },
    2: {
      changes: [
        {
          type: 'mappings_addition',
          addedMappings: {
            controlGroupInput: {
              properties: {
                showApplySelections: { type: 'boolean', index: false, doc_values: false },
              },
            },
          },
        },
      ],
      schemas: {
        forwardCompatibility: dashboardAttributesSchemaV2.extends({}, { unknowns: 'ignore' }),
        create: dashboardAttributesSchemaV2,
      },
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
          showApplySelections: { type: 'boolean', index: false, doc_values: false },
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
    '8.9.0': dashboardAttributesSchemaV1,
  },
  migrations: () => createDashboardSavedObjectTypeMigrations(migrationDeps),
});
