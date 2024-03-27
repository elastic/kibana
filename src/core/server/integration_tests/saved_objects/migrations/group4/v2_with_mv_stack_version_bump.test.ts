/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import fs from 'fs/promises';
import { range, sortBy } from 'lodash';
import { type TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import { SavedObjectsBulkCreateObject } from '@kbn/core-saved-objects-api-server';
import { modelVersionToVirtualVersion } from '@kbn/core-saved-objects-base-server-internal';
import '../jest_matchers';
import { getKibanaMigratorTestKit, startElasticsearch } from '../kibana_migrator_test_kit';
import { delay, createType, parseLogFile } from '../test_utils';
import { getBaseMigratorParams } from '../fixtures/zdt_base.fixtures';

const logFilePath = Path.join(__dirname, 'v2_with_mv_stack_version_bump.test.log');

const NB_DOCS_PER_TYPE = 100;

describe('V2 algorithm - using model versions - stack version bump scenario', () => {
  let esServer: TestElasticsearchUtils['es'];

  beforeAll(async () => {
    await fs.unlink(logFilePath).catch(() => {});
    esServer = await startElasticsearch();
  });

  afterAll(async () => {
    await esServer?.stop();
    await delay(10);
  });

  const getTestSwitchType = ({ beforeUpgrade }: { beforeUpgrade: boolean }) => {
    const type = createType({
      name: 'test_switch',
      namespaceType: 'single',
      migrations: {
        '8.7.0': (doc) => {
          return doc;
        },
      },
      modelVersions: {},
      mappings: {
        properties: {
          field1: { type: 'text' },
          field2: { type: 'text' },
        },
      },
    });

    if (!beforeUpgrade) {
      Object.assign<typeof type, Partial<typeof type>>(type, {
        switchToModelVersionAt: '8.8.0',
        modelVersions: {
          1: {
            changes: [
              {
                type: 'mappings_addition',
                addedMappings: {
                  field3: { type: 'text' },
                },
              },
              {
                type: 'data_backfill',
                backfillFn: (document) => {
                  return { attributes: { field3: 'test_switch-backfilled' } };
                },
              },
            ],
          },
        },
        mappings: {
          ...type.mappings,
          properties: {
            ...type.mappings.properties,
            field3: { type: 'text' },
          },
        },
      });
    }

    return type;
  };

  const getTestModelVersionType = ({ beforeUpgrade }: { beforeUpgrade: boolean }) => {
    const type = createType({
      name: 'test_mv',
      namespaceType: 'single',
      migrations: {},
      switchToModelVersionAt: '8.8.0',
      modelVersions: {
        1: {
          changes: [],
        },
      },
      mappings: {
        properties: {
          field1: { type: 'text' },
          field2: { type: 'text' },
        },
      },
    });

    if (!beforeUpgrade) {
      Object.assign<typeof type, Partial<typeof type>>(type, {
        modelVersions: {
          ...type.modelVersions,
          2: {
            changes: [
              {
                type: 'mappings_addition',
                addedMappings: {
                  field3: { type: 'text' },
                },
              },
              {
                type: 'data_backfill',
                backfillFn: (document) => {
                  return { attributes: { field3: 'test_mv-backfilled' } };
                },
              },
            ],
          },
        },
        mappings: {
          ...type.mappings,
          properties: {
            ...type.mappings.properties,
            field3: { type: 'text' },
          },
        },
      });
    }

    return type;
  };

  const createBaseline = async () => {
    const { runMigrations, savedObjectsRepository } = await getKibanaMigratorTestKit({
      ...getBaseMigratorParams({
        migrationAlgorithm: 'v2',
        kibanaVersion: '8.8.0',
      }),
      types: [
        getTestSwitchType({ beforeUpgrade: true }),
        getTestModelVersionType({ beforeUpgrade: true }),
      ],
    });
    await runMigrations();

    const switchObjs = range(NB_DOCS_PER_TYPE).map<SavedObjectsBulkCreateObject>((number) => ({
      id: `switch-${String(number).padStart(3, '0')}`,
      type: 'test_switch',
      attributes: {
        field1: `f1-${number}`,
        field2: `f2-${number}`,
      },
    }));

    await savedObjectsRepository.bulkCreate(switchObjs);

    const mvObjs = range(NB_DOCS_PER_TYPE).map<SavedObjectsBulkCreateObject>((number) => ({
      id: `mv-${String(number).padStart(3, '0')}`,
      type: 'test_mv',
      attributes: {
        field1: `f1-${number}`,
        field2: `f2-${number}`,
      },
    }));

    await savedObjectsRepository.bulkCreate(mvObjs);
  };

  it('migrates the documents', async () => {
    await createBaseline();

    const switchType = getTestSwitchType({ beforeUpgrade: false });
    const modelVersionType = getTestModelVersionType({ beforeUpgrade: false });

    const { runMigrations, client, savedObjectsRepository } = await getKibanaMigratorTestKit({
      ...getBaseMigratorParams({ migrationAlgorithm: 'v2' }),
      logFilePath,
      types: [switchType, modelVersionType],
    });
    await runMigrations();

    const indices = await client.indices.get({ index: '.kibana*' });
    expect(Object.keys(indices)).toEqual(['.kibana_8.8.0_001']);

    const index = indices['.kibana_8.8.0_001'];
    const mappings = index.mappings ?? {};
    const mappingMeta = mappings._meta ?? {};

    expect(mappings.properties).toEqual(
      expect.objectContaining({
        test_switch: switchType.mappings,
        test_mv: modelVersionType.mappings,
      })
    );

    expect(mappingMeta).toEqual({
      indexTypesMap: {
        '.kibana': ['test_mv', 'test_switch'],
      },
      mappingVersions: {
        test_mv: '10.2.0',
        test_switch: '10.1.0',
      },
    });

    const { saved_objects: testSwitchDocs } = await savedObjectsRepository.find({
      type: 'test_switch',
      perPage: 1000,
    });
    const { saved_objects: testMvDocs } = await savedObjectsRepository.find({
      type: 'test_mv',
      perPage: 1000,
    });

    expect(testSwitchDocs).toHaveLength(NB_DOCS_PER_TYPE);
    expect(testMvDocs).toHaveLength(NB_DOCS_PER_TYPE);

    const testSwitchDocsData = sortBy(testSwitchDocs, 'id').map((object) => ({
      id: object.id,
      type: object.type,
      attributes: object.attributes,
      version: object.typeMigrationVersion,
    }));

    expect(testSwitchDocsData).toEqual(
      range(NB_DOCS_PER_TYPE).map((number) => ({
        id: `switch-${String(number).padStart(3, '0')}`,
        type: 'test_switch',
        attributes: {
          field1: `f1-${number}`,
          field2: `f2-${number}`,
          field3: 'test_switch-backfilled',
        },
        version: modelVersionToVirtualVersion(1),
      }))
    );

    const testMvData = sortBy(testMvDocs, 'id').map((object) => ({
      id: object.id,
      type: object.type,
      attributes: object.attributes,
      version: object.typeMigrationVersion,
    }));

    expect(testMvData).toEqual(
      range(NB_DOCS_PER_TYPE).map((number) => ({
        id: `mv-${String(number).padStart(3, '0')}`,
        type: 'test_mv',
        attributes: {
          field1: `f1-${number}`,
          field2: `f2-${number}`,
          field3: 'test_mv-backfilled',
        },
        version: modelVersionToVirtualVersion(2),
      }))
    );

    const records = await parseLogFile(logFilePath);
    expect(records).toContainLogEntries(
      [
        'INIT -> WAIT_FOR_YELLOW_SOURCE',
        'CLEANUP_UNKNOWN_AND_EXCLUDED_WAIT_FOR_TASK -> PREPARE_COMPATIBLE_MIGRATION',
        'Migration completed',
      ],
      {
        ordered: true,
      }
    );
  });
});
