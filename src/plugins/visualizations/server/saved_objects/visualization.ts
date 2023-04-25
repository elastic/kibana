/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ANALYTICS_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { SavedObjectsType } from '@kbn/core/server';
import { MigrateFunctionsObject } from '@kbn/kibana-utils-plugin/common';
import { getAllMigrations } from '../migrations/visualization_saved_object_migrations';

export const getVisualizationSavedObjectType = (
  getSearchSourceMigrations: () => MigrateFunctionsObject
): SavedObjectsType => ({
  name: 'visualization',
  indexPattern: ANALYTICS_SAVED_OBJECT_INDEX,
  hidden: false,
  namespaceType: 'multiple-isolated',
  convertToMultiNamespaceTypeVersion: '8.0.0',
  management: {
    icon: 'visualizeApp',
    defaultSearchField: 'title',
    importableAndExportable: true,
    getTitle(obj) {
      return obj.attributes.title;
    },
    getInAppUrl(obj) {
      return {
        path: `/app/visualize#/edit/${encodeURIComponent(obj.id)}`,
        uiCapabilitiesPath: 'visualize.show',
      };
    },
  },
  mappings: {
    dynamic: false, // declared here to prevent indexing root level attribute fields
    properties: {
      description: { type: 'text' },
      kibanaSavedObjectMeta: {
        properties: {},
      },
      title: { type: 'text' },
      version: { type: 'integer' },
    },
  },
  migrations: () => getAllMigrations(getSearchSourceMigrations()),
});
