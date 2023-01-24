/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectsType } from '@kbn/core/server';
import { MigrateFunctionsObject } from '@kbn/kibana-utils-plugin/common';
import { getAllMigrations } from '../migrations/visualization_saved_object_migrations';

export const getVisualizationSavedObjectType = (
  getSearchSourceMigrations: () => MigrateFunctionsObject
): SavedObjectsType => ({
  name: 'visualization',
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
    properties: {
      description: { type: 'text' },
      kibanaSavedObjectMeta: {
        properties: { searchSourceJSON: { type: 'text', index: false } },
      },
      savedSearchRefName: { type: 'keyword', index: false, doc_values: false },
      title: { type: 'text' },
      uiStateJSON: { type: 'text', index: false },
      version: { type: 'integer' },
      visState: { type: 'text', index: false },
    },
  },
  migrations: () => getAllMigrations(getSearchSourceMigrations()),
});
