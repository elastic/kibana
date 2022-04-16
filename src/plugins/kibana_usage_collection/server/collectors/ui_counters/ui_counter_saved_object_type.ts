/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObject, SavedObjectAttributes, SavedObjectsServiceSetup } from '@kbn/core/server';

export interface UICounterSavedObjectAttributes extends SavedObjectAttributes {
  count: number;
}

export type UICounterSavedObject = SavedObject<UICounterSavedObjectAttributes>;

export const UI_COUNTER_SAVED_OBJECT_TYPE = 'ui-counter';

export function registerUiCounterSavedObjectType(savedObjectsSetup: SavedObjectsServiceSetup) {
  savedObjectsSetup.registerType({
    name: UI_COUNTER_SAVED_OBJECT_TYPE,
    hidden: false,
    namespaceType: 'agnostic',
    mappings: {
      properties: {
        count: { type: 'integer' },
      },
    },
  });
}
