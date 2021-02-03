/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { SavedObjectsType } from 'kibana/server';
import { visualizationSavedObjectTypeMigrations } from './visualization_migrations';

export const visualizationSavedObjectType: SavedObjectsType = {
  name: 'visualization',
  hidden: false,
  namespaceType: 'single',
  management: {
    icon: 'visualizeApp',
    defaultSearchField: 'title',
    importableAndExportable: true,
    getTitle(obj) {
      return obj.attributes.title;
    },
    getEditUrl(obj) {
      return `/management/kibana/objects/savedVisualizations/${encodeURIComponent(obj.id)}`;
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
  migrations: visualizationSavedObjectTypeMigrations,
};
