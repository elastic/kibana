/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectsModelVersion } from '@kbn/core-saved-objects-server';
import { createType } from '../test_utils';

export const dummyModelVersion: SavedObjectsModelVersion = {
  modelChange: {
    type: 'expansion',
  },
};

export const getFooType = () => {
  return createType({
    name: 'foo',
    mappings: {
      properties: {
        someField: { type: 'text' },
      },
    },
    switchToModelVersionAt: '8.7.0',
    modelVersions: {
      '1': dummyModelVersion,
      '2': dummyModelVersion,
    },
  });
};

export const getBarType = () => {
  return createType({
    name: 'bar',
    mappings: {
      properties: {
        aKeyword: { type: 'keyword' },
      },
    },
    switchToModelVersionAt: '8.7.0',
    modelVersions: {
      '1': dummyModelVersion,
    },
  });
};
