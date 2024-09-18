/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectsBulkCreateObject } from '@kbn/core-saved-objects-api-server';
import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import {
  currentVersion,
  defaultKibanaIndex,
  defaultLogFilePath,
  getKibanaMigratorTestKit,
  nextMinor,
} from './kibana_migrator_test_kit';

const defaultType: SavedObjectsType<any> = {
  name: 'defaultType',
  hidden: false,
  namespaceType: 'agnostic',
  mappings: {
    properties: {
      name: { type: 'keyword' },
    },
  },
  modelVersions: {
    1: {
      changes: [],
    },
  },
  switchToModelVersionAt: '8.10.0',
  migrations: {},
};

export const baselineTypes: Array<SavedObjectsType<any>> = [
  {
    ...defaultType,
    name: 'server',
  },
  {
    ...defaultType,
    name: 'basic',
  },
  {
    ...defaultType,
    name: 'deprecated',
  },
  {
    ...defaultType,
    name: 'complex',
    mappings: {
      properties: {
        name: { type: 'text' },
        value: { type: 'integer' },
      },
    },
    excludeOnUpgrade: () => {
      return {
        bool: {
          must: [{ term: { type: 'complex' } }, { range: { 'complex.value': { lte: 1 } } }],
        },
      };
    },
  },
];

export const baselineDocuments: SavedObjectsBulkCreateObject[] = [
  ...['server-foo', 'server-bar', 'server-baz'].map((name) => ({
    type: 'server',
    attributes: {
      name,
    },
  })),
  ...['basic-foo', 'basic-bar', 'basic-baz'].map((name) => ({
    type: 'basic',
    attributes: {
      name,
    },
  })),
  ...['deprecated-foo', 'deprecated-bar', 'deprecated-baz'].map((name) => ({
    type: 'deprecated',
    attributes: {
      name,
    },
  })),
  ...['complex-foo', 'complex-bar', 'complex-baz', 'complex-lipsum'].map((name, index) => ({
    type: 'complex',
    attributes: {
      name,
      value: index,
    },
  })),
];

export const createBaseline = async () => {
  const { client, runMigrations, savedObjectsRepository } = await getKibanaMigratorTestKit({
    kibanaIndex: defaultKibanaIndex,
    types: baselineTypes,
  });

  // remove the testing index (current and next minor)
  await client.indices.delete({
    index: [
      defaultKibanaIndex,
      `${defaultKibanaIndex}_${currentVersion}_001`,
      `${defaultKibanaIndex}_${nextMinor}_001`,
    ],
    ignore_unavailable: true,
  });

  await runMigrations();

  await savedObjectsRepository.bulkCreate(baselineDocuments, {
    refresh: 'wait_for',
  });

  return client;
};

interface GetMutatedMigratorParams {
  logFilePath?: string;
  kibanaVersion?: string;
  types?: Array<SavedObjectsType<any>>;
  settings?: Record<string, any>;
}

export const getUpToDateMigratorTestKit = async ({
  logFilePath = defaultLogFilePath,
  kibanaVersion = nextMinor,
  types = baselineTypes,
  settings = {},
}: GetMutatedMigratorParams = {}) => {
  return await getKibanaMigratorTestKit({
    types,
    logFilePath,
    kibanaVersion,
    settings,
  });
};

export const getCompatibleMigratorTestKit = async ({
  logFilePath = defaultLogFilePath,
  filterDeprecated = false,
  kibanaVersion = nextMinor,
  settings = {},
}: GetMutatedMigratorParams & {
  filterDeprecated?: boolean;
} = {}) => {
  const types = baselineTypes
    .filter((type) => !filterDeprecated || type.name !== 'deprecated')
    .map<SavedObjectsType>((type) => {
      if (type.name === 'complex') {
        return {
          ...type,
          mappings: {
            properties: {
              ...type.mappings.properties,
              createdAt: { type: 'date' },
            },
          },
          modelVersions: {
            ...type.modelVersions,
            2: {
              changes: [
                {
                  type: 'mappings_addition',
                  addedMappings: {
                    createdAt: { type: 'date' },
                  },
                },
              ],
            },
          },
        };
      } else {
        return type;
      }
    });

  return await getKibanaMigratorTestKit({
    logFilePath,
    types,
    kibanaVersion,
    settings,
  });
};

export const getReindexingMigratorTestKit = async ({
  logFilePath = defaultLogFilePath,
  kibanaVersion = nextMinor,
  settings = {},
}: GetMutatedMigratorParams = {}) => {
  const types = baselineTypes.map<SavedObjectsType>((type) => {
    if (type.name === 'complex') {
      return {
        ...type,
        mappings: {
          properties: {
            ...type.mappings.properties,
            value: { type: 'text' }, // we're forcing an incompatible udpate (number => text)
            createdAt: { type: 'date' },
          },
        },
        modelVersions: {
          ...type.modelVersions,
          2: {
            changes: [
              {
                type: 'data_removal', // not true (we're testing reindex migrations, and modelVersions do not support breaking changes)
                removedAttributePaths: ['complex.properties.value'],
              },
              {
                type: 'mappings_addition',
                addedMappings: {
                  createdAt: { type: 'date' },
                },
              },
            ],
          },
        },
      };
    } else {
      return type;
    }
  });

  return await getKibanaMigratorTestKit({
    logFilePath,
    types,
    kibanaVersion,
    settings,
  });
};
