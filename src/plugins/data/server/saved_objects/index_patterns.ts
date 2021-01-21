/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { SavedObjectsType } from 'kibana/server';
import { indexPatternSavedObjectTypeMigrations } from './index_pattern_migrations';

export const indexPatternSavedObjectType: SavedObjectsType = {
  name: 'index-pattern',
  hidden: false,
  namespaceType: 'single',
  management: {
    icon: 'indexPatternApp',
    defaultSearchField: 'title',
    importableAndExportable: true,
    getTitle(obj) {
      return obj.attributes.title;
    },
    getEditUrl(obj) {
      return `/management/kibana/indexPatterns/patterns/${encodeURIComponent(obj.id)}`;
    },
    getInAppUrl(obj) {
      return {
        path: `/app/management/kibana/indexPatterns/patterns/${encodeURIComponent(obj.id)}`,
        uiCapabilitiesPath: 'management.kibana.indexPatterns',
      };
    },
  },
  mappings: {
    dynamic: false,
    properties: {
      title: { type: 'text' },
      type: { type: 'keyword' },
    },
  },
  migrations: indexPatternSavedObjectTypeMigrations as any,
};
