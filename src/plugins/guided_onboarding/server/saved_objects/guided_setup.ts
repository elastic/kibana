/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectsType } from '@kbn/core/server';

export const guidedSetupSavedObjectsType = 'guided-setup-state';
export const guidedSetupSavedObjectsId = 'guided-setup-state-id';
export const guidedSetupDefaultState = {
  activeGuide: 'unset',
  activeStep: 'unset',
};
export const guidedSetupSavedObjects: SavedObjectsType = {
  name: guidedSetupSavedObjectsType,
  hidden: false,
  // make it available in all spaces for now
  namespaceType: 'agnostic',
  mappings: {
    dynamic: false,
    properties: {
      activeGuide: {
        type: 'keyword',
      },
      activeStep: {
        type: 'keyword',
      },
    },
  },
};
