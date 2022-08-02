/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectsType } from '@kbn/core/server';
import {
  createDashboardSavedObjectTypeMigrations,
  DashboardSavedObjectTypeMigrationsDeps,
} from './dashboard_migrations';

export const createDashboardSavedObjectType = ({
  migrationDeps,
}: {
  migrationDeps: DashboardSavedObjectTypeMigrationsDeps;
}): SavedObjectsType => ({
  name: 'dashboard',
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
  migrations: () => createDashboardSavedObjectTypeMigrations(migrationDeps),
});
