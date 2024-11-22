/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SavedObjectsType } from '@kbn/core/server';

export const guideStateSavedObjectsType = 'guided-onboarding-guide-state';

export const guideStateSavedObjects: SavedObjectsType = {
  name: guideStateSavedObjectsType,
  // hidden SO can't be changed by the SO client except when explicitly declared
  hidden: true,
  // make it available in all spaces for now https://github.com/elastic/kibana/issues/144227
  namespaceType: 'agnostic',
  mappings: {
    dynamic: false,
    properties: {
      guideId: {
        type: 'keyword',
      },
      isActive: {
        type: 'boolean',
      },
    },
  },
};

export const pluginStateSavedObjectsType = 'guided-onboarding-plugin-state';
export const pluginStateSavedObjectsId = 'guided-onboarding-plugin-state-id';

export const pluginStateSavedObjects: SavedObjectsType = {
  name: pluginStateSavedObjectsType,
  // hidden SO can't be changed by the SO client except when explicitly declared
  hidden: true,
  // make it available in all spaces for now https://github.com/elastic/kibana/issues/144227
  namespaceType: 'agnostic',
  mappings: {
    dynamic: false,
    // we don't query this SO so no need for mapping properties, see PluginState intefrace
    properties: {},
  },
};

// plugin state SO interface
export interface PluginStateSO {
  status: string;
  creationDate: string;
}
