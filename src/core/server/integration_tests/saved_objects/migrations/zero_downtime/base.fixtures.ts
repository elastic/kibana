/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectsModelVersion } from '@kbn/core-saved-objects-server';
import { createType } from '../test_utils';
import { type KibanaMigratorTestKitParams } from '../kibana_migrator_test_kit';

export const getBaseMigratorParams = (): KibanaMigratorTestKitParams => ({
  kibanaIndex: '.kibana',
  kibanaVersion: '8.8.0',
  settings: {
    migrations: {
      algorithm: 'zdt',
      zdt: {
        metaPickupSyncDelaySec: 5,
      },
    },
  },
});

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

export const getSampleAType = () => {
  return createType({
    name: 'sample_a',
    mappings: {
      properties: {
        keyword: { type: 'keyword' },
        boolean: { type: 'boolean' },
      },
    },
    switchToModelVersionAt: '8.7.0',
    modelVersions: {
      '1': dummyModelVersion,
    },
  });
};

export const getSampleBType = () => {
  return createType({
    name: 'sample_b',
    mappings: {
      properties: {
        text: { type: 'text' },
        text2: { type: 'text' },
      },
    },
    switchToModelVersionAt: '8.7.0',
    modelVersions: {
      '1': dummyModelVersion,
    },
  });
};

export const getDeletedType = () => {
  return createType({
    // we cant' easily introduce a deleted type, so we're using an existing one
    name: 'server',
    mappings: {
      properties: {
        text: { type: 'text' },
      },
    },
    switchToModelVersionAt: '8.7.0',
    modelVersions: {
      '1': dummyModelVersion,
    },
  });
};

export const getExcludedType = () => {
  return createType({
    // we cant' easily introduce a deleted type, so we're using an existing one
    name: 'excluded',
    mappings: {
      properties: {
        value: { type: 'integer' },
      },
    },
    switchToModelVersionAt: '8.7.0',
    modelVersions: {
      '1': dummyModelVersion,
    },
    excludeOnUpgrade: () => {
      return {
        bool: {
          must: [{ term: { type: 'excluded' } }, { range: { 'excluded.value': { lte: 1 } } }],
        },
      };
    },
  });
};
