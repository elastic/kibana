/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SavedObjectsModelVersion, SavedObjectMigrationFn } from '@kbn/core-saved-objects-server';
import { createType } from '../test_utils';
import { type KibanaMigratorTestKitParams, currentVersion } from '../kibana_migrator_test_kit';

export const getBaseMigratorParams = ({
  migrationAlgorithm = 'zdt',
  // default to true here as most tests need to run the full migration
  runOnNonMigratorNodes = true,
  kibanaVersion = currentVersion,
}: {
  runOnNonMigratorNodes?: boolean;
  migrationAlgorithm?: 'v2' | 'zdt';
  kibanaVersion?: string;
} = {}): KibanaMigratorTestKitParams => ({
  kibanaIndex: '.kibana',
  kibanaVersion,
  settings: {
    migrations: {
      algorithm: migrationAlgorithm,
      zdt: {
        metaPickupSyncDelaySec: 5,
        runOnRoles: runOnNonMigratorNodes ? ['ui', 'migrator'] : ['migrator'],
      },
    },
  },
});

export const dummyModelVersion: SavedObjectsModelVersion = {
  changes: [
    {
      type: 'mappings_addition',
      addedMappings: {},
    },
  ],
};

export const noopMigration: SavedObjectMigrationFn = (doc) => doc;

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

export const getLegacyType = () => {
  return createType({
    name: 'legacy',
    mappings: {
      properties: {
        someField: { type: 'text' },
      },
    },
    migrations: {
      '7.0.0': noopMigration,
      '7.5.0': noopMigration,
    },
  });
};
