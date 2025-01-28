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
import type { IndexTypesMap } from '@kbn/core-saved-objects-base-server-internal';
import type { ElasticsearchClientWrapperFactory } from './elasticsearch_client_wrapper';
import {
  currentVersion,
  defaultKibanaIndex,
  defaultKibanaTaskIndex,
  defaultLogFilePath,
  getKibanaMigratorTestKit,
  nextMinor,
} from './kibana_migrator_test_kit';

export const baselineIndexTypesMap: IndexTypesMap = {
  [defaultKibanaIndex]: ['basic', 'complex', 'server', 'deprecated'],
  [defaultKibanaTaskIndex]: ['task'],
};

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

export const getUpToDateBaselineTypes = (filterDeprecated: boolean) => [
  ...baselineTypes.filter((type) => !filterDeprecated || type.name !== 'deprecated'),
  // we add a new SO type
  {
    ...defaultType,
    name: 'recent',
  },
];

export const getCompatibleBaselineTypes = (filterDeprecated: boolean) =>
  getUpToDateBaselineTypes(filterDeprecated).map<SavedObjectsType>((type) => {
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

export const getReindexingBaselineTypes = (filterDeprecated: boolean) =>
  getUpToDateBaselineTypes(filterDeprecated).map<SavedObjectsType>((type) => {
    // introduce an incompatible change
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
              {
                type: 'unsafe_transform',
                transformFn: (doc) => {
                  if (doc.attributes.value % 100 === 0) {
                    throw new Error(
                      `Cannot convert 'complex' objects with values that are multiple of 100 ${doc.id}`
                    );
                  }
                  return { document: doc };
                },
              },
            ],
          },
        },
      };
    } else if (type.name === 'task') {
      return {
        ...type,
        mappings: {
          properties: {
            ...type.mappings.properties,
            lastRun: { type: 'date' },
          },
        },
        modelVersions: {
          ...type.modelVersions,
          2: {
            changes: [
              {
                type: 'mappings_addition',
                addedMappings: {
                  lastRun: { type: 'date' },
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
  filterDeprecated?: boolean;
  types?: Array<SavedObjectsType<any>>;
  settings?: Record<string, any>;
  clientWrapperFactory?: ElasticsearchClientWrapperFactory;
}

export const getUpToDateMigratorTestKit = async ({
  logFilePath = defaultLogFilePath,
  filterDeprecated = false,
  kibanaVersion = nextMinor,
  settings = {},
}: GetMutatedMigratorParams = {}) => {
  return await getKibanaMigratorTestKit({
    types: getUpToDateBaselineTypes(filterDeprecated),
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
  return await getKibanaMigratorTestKit({
    logFilePath,
    types: getCompatibleBaselineTypes(filterDeprecated),
    kibanaVersion,
    settings,
  });
};

export const getReindexingMigratorTestKit = async ({
  logFilePath = defaultLogFilePath,
  filterDeprecated = false,
  types = getReindexingBaselineTypes(filterDeprecated),
  kibanaVersion = nextMinor,
  clientWrapperFactory,
  settings = {},
}: GetMutatedMigratorParams = {}) => {
  return await getKibanaMigratorTestKit({
    logFilePath,
    types,
    kibanaVersion,
    clientWrapperFactory,
    settings: {
      ...settings,
      migrations: {
        discardUnknownObjects: nextMinor,
        discardCorruptObjects: nextMinor,
        ...settings.migrations,
      },
    },
  });
};

export const kibanaSplitIndex = `${defaultKibanaIndex}_split`;
export const getRelocatingMigratorTestKit = async ({
  logFilePath = defaultLogFilePath,
  filterDeprecated = false,
  // relocate 'task' and 'basic' objects to a new SO index
  relocateTypes = {
    task: kibanaSplitIndex,
    basic: kibanaSplitIndex,
  },
  types = getReindexingBaselineTypes(filterDeprecated).map((type) => ({
    ...type,
    ...(relocateTypes[type.name] && { indexPattern: relocateTypes[type.name] }),
  })),
  kibanaVersion = nextMinor,
  clientWrapperFactory,
  settings = {},
}: GetMutatedMigratorParams & { relocateTypes?: Record<string, string> } = {}) => {
  return await getKibanaMigratorTestKit({
    logFilePath,
    types,
    kibanaVersion,
    clientWrapperFactory,
    defaultIndexTypesMap: baselineIndexTypesMap,
    settings: {
      ...settings,
      migrations: {
        discardUnknownObjects: nextMinor,
        discardCorruptObjects: nextMinor,
        ...settings.migrations,
      },
    },
  });
};
