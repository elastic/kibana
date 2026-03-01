/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectsType } from '@kbn/core/server';
import { ANALYTICS_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { MINI_APP_SAVED_OBJECT_TYPE } from '../../common';

export const miniAppSavedObjectType: SavedObjectsType = {
  name: MINI_APP_SAVED_OBJECT_TYPE,
  indexPattern: ANALYTICS_SAVED_OBJECT_INDEX,
  hidden: false,
  namespaceType: 'multiple-isolated',
  management: {
    icon: 'apps',
    defaultSearchField: 'name',
    importableAndExportable: true,
    getTitle(obj) {
      return obj.attributes.name;
    },
  },
  mappings: {
    dynamic: false,
    properties: {
      name: { type: 'text' },
      script_code: { type: 'text', index: false },
      created_at: { type: 'date' },
      updated_at: { type: 'date' },
      versions: { type: 'object', enabled: false },
    },
  },
  migrations: () => {
    return {};
  },
};
