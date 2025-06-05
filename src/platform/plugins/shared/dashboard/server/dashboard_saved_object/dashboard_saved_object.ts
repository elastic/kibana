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
import { dashboardAttributesSchema as dashboardAttributesSchemaV3 } from './schema/v3';
import { dashboardAttributesSchema as dashboardAttributesSchemaV4 } from './schema/v4';

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
    3: {
      changes: [
        {
          type: 'mappings_addition',
          addedMappings: {
            sections: { properties: {}, dynamic: false },
          },
        },
      ],
      schemas: {
        forwardCompatibility: dashboardAttributesSchemaV3.extends({}, { unknowns: 'ignore' }),
        create: dashboardAttributesSchemaV3,
      },
    },
    4: {
      // remove **all** non-indexed fields from the mapping so that we can treat the dashboard SO as a black box
      changes: [
        {
          type: 'mappings_deprecation',
          deprecatedMappings: [
            'hits',
            'kibanaSavedObjectMeta',
            'optionsJSON',
            'panelsJSON',
            'sections',
            'refreshInterval',
            'controlGroupInput',
            'timeFrom',
            'timeRestore',
            'timeTo',
          ],
        },
      ],
      schemas: {
        forwardCompatibility: dashboardAttributesSchemaV4.extends({}, { unknowns: 'ignore' }),
        create: dashboardAttributesSchemaV4,
      },
    },
  },
  mappings: {
    dynamic: false,
    properties: {
      description: { type: 'text' },
      title: { type: 'text' },
      version: { type: 'integer' },
    },
  },
  schemas: {
    '8.9.0': dashboardAttributesSchemaV1,
  },
  migrations: () => createDashboardSavedObjectTypeMigrations(migrationDeps),
});
