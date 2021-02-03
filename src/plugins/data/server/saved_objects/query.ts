/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { SavedObjectsType } from 'kibana/server';

export const querySavedObjectType: SavedObjectsType = {
  name: 'query',
  hidden: false,
  namespaceType: 'single',
  management: {
    icon: 'search',
    defaultSearchField: 'title',
    importableAndExportable: true,
    getTitle(obj) {
      return obj.attributes.title;
    },
    getInAppUrl(obj) {
      return {
        path: `/app/discover#/?_a=(savedQuery:'${encodeURIComponent(obj.id)}')`,
        uiCapabilitiesPath: 'discover.show',
      };
    },
  },
  mappings: {
    properties: {
      title: { type: 'text' },
      description: { type: 'text' },
      query: {
        properties: { language: { type: 'keyword' }, query: { type: 'keyword', index: false } },
      },
      filters: { type: 'object', enabled: false },
      timefilter: { type: 'object', enabled: false },
    },
  },
  migrations: {},
};
