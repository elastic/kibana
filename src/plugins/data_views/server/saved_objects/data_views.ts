/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObjectsType } from '@kbn/core/server';
import { indexPatternSavedObjectTypeMigrations } from './index_pattern_migrations';
import { DATA_VIEW_SAVED_OBJECT_TYPE } from '../../common';

export const dataViewSavedObjectType: SavedObjectsType = {
  name: DATA_VIEW_SAVED_OBJECT_TYPE,
  hidden: false,
  namespaceType: 'multiple',
  convertToMultiNamespaceTypeVersion: '8.0.0',
  management: {
    displayName: 'data view',
    icon: 'indexPatternApp',
    defaultSearchField: 'title',
    importableAndExportable: true,
    getTitle(obj) {
      return obj.attributes.title;
    },
    getEditUrl(obj) {
      return `/management/kibana/dataViews/dataView/${encodeURIComponent(obj.id)}`;
    },
    getInAppUrl(obj) {
      return {
        path: `/app/management/kibana/dataViews/dataView/${encodeURIComponent(obj.id)}`,
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
