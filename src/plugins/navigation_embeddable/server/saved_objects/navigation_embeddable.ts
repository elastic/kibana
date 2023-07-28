/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObjectsType } from '@kbn/core/server';
import { ANALYTICS_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { CONTENT_ID } from '../../common';
import { APP_ICON } from '../../common/constants';

export const navigationEmbeddableSavedObjectType: SavedObjectsType = {
  name: CONTENT_ID,
  indexPattern: ANALYTICS_SAVED_OBJECT_INDEX,
  hidden: false,
  namespaceType: 'multiple',
  management: {
    icon: APP_ICON,
    defaultSearchField: 'title',
    importableAndExportable: true,
    getTitle(obj) {
      return obj.attributes.title;
    },
  },
  mappings: {
    properties: {
      id: { type: 'text' },
      title: { type: 'text' },
      description: { type: 'text' },
      links: {
        dynamic: false,
        properties: {},
      },
    },
  },
  migrations: () => {
    return {};
  },
};
