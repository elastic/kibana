/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import fs from 'fs/promises';
import { range } from 'lodash';
import { type TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import { SavedObjectsBulkCreateObject } from '@kbn/core-saved-objects-api-server';
import '../jest_matchers';
import { getKibanaMigratorTestKit, startElasticsearch } from '../kibana_migrator_test_kit';
import { parseLogFile, createType } from '../test_utils';
import { getBaseMigratorParams, noopMigration } from '../fixtures/zdt_base.fixtures';

const logFilePath = Path.join(__dirname, 'v2_to_zdt_partial_failure.test.log');

describe('ZDT with v2 compat - recovering from partially migrated state', () => {
  let esServer: TestElasticsearchUtils['es'];

  beforeAll(async () => {
    await fs.unlink(logFilePath).catch(() => {});
    esServer = await startElasticsearch();
  });

  afterAll(async () => {
    await esServer?.stop();
  });

  const typeBefore = createType({
    name: 'switching_type',
    mappings: {
      properties: {
        text: { type: 'text' },
        keyword: { type: 'keyword' },
      },
    },
    migrations: {
      '7.0.0': noopMigration,
      '7.5.0': noopMigration,
    },
  });

  const typeFailingBetween = createType({
    ...typeBefore,
    switchToModelVersionAt: '8.0.0',
    modelVersions: {
      1: {
        changes: [
          {
            type: 'data_backfill',
            backfillFn: (doc) => {
              // this was the easiest way to simulate a migrate failure during doc mig.
              throw new Error('need something to interrupt the migration');
            },
          },
        ],
      },
    },
    mappings: {
      properties: {
        text: { type: 'text' },
        keyword: { type: 'keyword' },
        newField: { type: 'text' },
      },
    },
  });

  const typeAfter = createType({
    ...typeBefore,
    switchToModelVersionAt: '8.0.0',
    modelVersions: {
      1: {
        changes: [
          {
            type: 'data_backfill',
            backfillFn: (doc) => {
              return { attributes: { newField: 'some value' } };
            },
          },
        ],
      },
    },
    mappings: {
      properties: {
        text: { type: 'text' },
        keyword: { type: 'keyword' },
        newField: { type: 'text' },
      },
    },
  });

  const createBaseline = async () => {
    const { runMigrations, savedObjectsRepository } = await getKibanaMigratorTestKit({
      ...getBaseMigratorParams({ migrationAlgorithm: 'v2', kibanaVersion: '8.9.0' }),
      types: [typeBefore],
    });
    await runMigrations();

    const sampleObjs = range(5).map<SavedObjectsBulkCreateObject>((number) => ({
      id: `doc-${number}`,
      type: 'switching_type',
      attributes: {
        text: `text ${number}`,
        keyword: `kw ${number}`,
      },
    }));

    await savedObjectsRepository.bulkCreate(sampleObjs);
  };

  const runFailingMigration = async () => {
    const { runMigrations } = await getKibanaMigratorTestKit({
      ...getBaseMigratorParams(),
      types: [typeFailingBetween],
    });

    await expect(runMigrations()).rejects.toBeDefined();
  };

  it('migrates the documents', async () => {
    await createBaseline();
    await runFailingMigration();

    const { runMigrations, client, savedObjectsRepository } = await getKibanaMigratorTestKit({
      ...getBaseMigratorParams(),
      logFilePath,
      types: [typeAfter],
    });

    await runMigrations();

    const indices = await client.indices.get({ index: '.kibana*' });
    expect(Object.keys(indices)).toEqual(['.kibana_8.9.0_001']);

    const index = indices['.kibana_8.9.0_001'];
    const mappings = index.mappings ?? {};
    const mappingMeta = mappings._meta ?? {};

    expect(mappings.properties).toEqual(
      expect.objectContaining({
        switching_type: typeAfter.mappings,
      })
    );

    expect(mappingMeta.docVersions).toEqual({
      switching_type: '10.1.0',
    });

    const { saved_objects: sampleDocs } = await savedObjectsRepository.find({
      type: 'switching_type',
    });

    expect(sampleDocs).toHaveLength(5);

    const records = await parseLogFile(logFilePath);
    expect(records).toContainLogEntries(
      [
        'current algo check result: v2-partially-migrated',
        'INIT -> INDEX_STATE_UPDATE_DONE',
        'INDEX_STATE_UPDATE_DONE -> DOCUMENTS_UPDATE_INIT',
        'Starting to process 5 documents.',
        '-> DONE',
        'Migration completed',
      ],
      { ordered: true }
    );
  });
});
