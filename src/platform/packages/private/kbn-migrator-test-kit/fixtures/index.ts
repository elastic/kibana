/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectsBulkCreateObject } from '@kbn/core-saved-objects-api-server';
import type { SavedObjectMigration, SavedObjectsType } from '@kbn/core-saved-objects-server';
import type { ElasticsearchClientWrapperFactory } from '../src/elasticsearch_client_wrapper';
import {
  currentVersion,
  defaultKibanaIndex,
  defaultKibanaTaskIndex,
  defaultLogFilePath,
  getKibanaMigratorTestKit,
  nextMinor,
} from '../src/kibana_migrator_test_kit';

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
  migrations: {},
};

export const REMOVED_TYPES = ['deprecated', 'server'];

export const baselineTypes: Array<SavedObjectsType<any>> = [
  {
    // an old type with no model versions defined
    ...defaultType,
    modelVersions: undefined,
    name: 'old',
    migrations: {
      '8.8.0': ((doc) => doc) as SavedObjectMigration,
    },
  },
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
    name: 'task',
    indexPattern: `${defaultKibanaIndex}_tasks`,
  },
  {
    ...defaultType,
    name: 'complex',
    mappings: {
      properties: {
        name: { type: 'text' },
        value: { type: 'integer' },
        firstHalf: { type: 'boolean' },
      },
    },
    excludeOnUpgrade: () => {
      return {
        bool: {
          must: [{ term: { type: 'complex' } }, { term: { 'complex.firstHalf': false } }],
        },
      };
    },
  },
];

export const getUpToDateBaselineTypes = (removedTypes: string[]) => [
  ...baselineTypes.filter((type) => !removedTypes.includes(type.name)),
  // we add a new SO type
  {
    ...defaultType,
    name: 'recent',
  },
];

export const getCompatibleBaselineTypes = (removedTypes: string[]) =>
  getUpToDateBaselineTypes(removedTypes).map<SavedObjectsType>((type) => {
    // introduce a compatible change
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

export interface GetBaselineDocumentsParams {
  documentsPerType?: number;
}

export const getBaselineDocuments = (
  params: GetBaselineDocumentsParams = {}
): SavedObjectsBulkCreateObject[] => {
  const documentsPerType = params.documentsPerType ?? 4;

  return [
    ...new Array(documentsPerType).fill(true).map((_, index) => ({
      type: 'old',
      attributes: {
        name: `old-${index}`,
      },
    })),
    ...new Array(documentsPerType).fill(true).map((_, index) => ({
      type: 'server',
      attributes: {
        name: `server-${index}`,
      },
    })),
    ...new Array(documentsPerType).fill(true).map((_, index) => ({
      type: 'basic',
      attributes: {
        name: `basic-${index}`,
      },
    })),
    ...new Array(documentsPerType).fill(true).map((_, index) => ({
      type: 'deprecated',
      attributes: {
        name: `deprecated-${index}`,
      },
    })),
    ...new Array(documentsPerType).fill(true).map((_, index) => ({
      type: 'task',
      attributes: {
        name: `task-${index}`,
      },
    })),
    ...new Array(documentsPerType).fill(true).map((_, index) => ({
      type: 'complex',
      attributes: {
        name: `complex-${index}`,
        firstHalf: index < documentsPerType / 2,
        value: index,
      },
    })),
  ];
};

export interface CreateBaselineParams {
  documentsPerType?: number;
}

export const createBaseline = async (params: CreateBaselineParams = {}) => {
  const { client, runMigrations, savedObjectsRepository } = await getKibanaMigratorTestKit({
    kibanaIndex: defaultKibanaIndex,
    types: baselineTypes,
  });

  // remove the testing indices (current and next minor)
  await client.indices.delete({
    index: [
      defaultKibanaIndex,
      `${defaultKibanaIndex}_${currentVersion}_001`,
      `${defaultKibanaIndex}_${nextMinor}_001`,
      defaultKibanaTaskIndex,
      `${defaultKibanaTaskIndex}_${currentVersion}_001`,
      `${defaultKibanaTaskIndex}_${nextMinor}_001`,
    ],
    ignore_unavailable: true,
  });

  await runMigrations();

  await savedObjectsRepository.bulkCreate(getBaselineDocuments(params), {
    refresh: 'wait_for',
  });

  return client;
};

interface GetMutatedMigratorParams {
  logFilePath?: string;
  kibanaVersion?: string;
  removedTypes?: string[];
  types?: Array<SavedObjectsType<any>>;
  settings?: Record<string, any>;
  clientWrapperFactory?: ElasticsearchClientWrapperFactory;
}

export const getUpToDateMigratorTestKit = async ({
  logFilePath = defaultLogFilePath,
  removedTypes = REMOVED_TYPES,
  types = getUpToDateBaselineTypes(removedTypes),
  kibanaVersion = nextMinor,
  settings = {},
}: GetMutatedMigratorParams = {}) => {
  return await getKibanaMigratorTestKit({
    types,
    removedTypes,
    logFilePath,
    kibanaVersion,
    settings,
  });
};

export const getCompatibleMigratorTestKit = async ({
  logFilePath = defaultLogFilePath,
  removedTypes = REMOVED_TYPES,
  types = getCompatibleBaselineTypes(removedTypes),
  kibanaVersion = nextMinor,
  settings = {},
}: GetMutatedMigratorParams = {}) => {
  return await getKibanaMigratorTestKit({
    logFilePath,
    types,
    removedTypes,
    kibanaVersion,
    settings,
  });
};
