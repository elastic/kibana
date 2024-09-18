/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import fs from 'fs/promises';
import { range } from 'lodash';
import { type TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import { SavedObjectsBulkCreateObject } from '@kbn/core-saved-objects-api-server';
import '../jest_matchers';
import { getKibanaMigratorTestKit, startElasticsearch } from '../kibana_migrator_test_kit';
import { parseLogFile, createType } from '../test_utils';
import { getBaseMigratorParams } from '../fixtures/zdt_base.fixtures';

export const logFilePath = Path.join(__dirname, 'basic_downgrade.test.log');

describe('ZDT upgrades - basic downgrade', () => {
  let esServer: TestElasticsearchUtils['es'];

  beforeAll(async () => {
    await fs.unlink(logFilePath).catch(() => {});
    esServer = await startElasticsearch();
  });

  afterAll(async () => {
    await esServer?.stop();
  });

  const typeV1 = createType({
    name: 'sample_type',
    mappings: {
      properties: {
        text: { type: 'text' },
        keyword: { type: 'keyword' },
      },
    },
    switchToModelVersionAt: '8.0.0',
    modelVersions: {
      1: {
        changes: [],
      },
    },
  });

  const typeV2 = createType({
    name: 'sample_type',
    mappings: {
      properties: {
        text: { type: 'text' },
        keyword: { type: 'keyword' },
        newField1: { type: 'text' },
      },
    },
    switchToModelVersionAt: '8.0.0',
    modelVersions: {
      1: {
        changes: [],
      },
      2: {
        changes: [
          {
            type: 'mappings_addition',
            addedMappings: {
              newField1: { type: 'text' },
            },
          },
        ],
      },
    },
  });

  const createBaseline = async () => {
    const { runMigrations, savedObjectsRepository } = await getKibanaMigratorTestKit({
      ...getBaseMigratorParams(),
      types: [typeV2],
    });
    await runMigrations();

    const sampleAObjs = range(5).map<SavedObjectsBulkCreateObject>((number) => ({
      id: `doc-${number}`,
      type: 'sample_type',
      attributes: {
        text: `text ${number}`,
        keyword: `kw ${number}`,
        newField1: `was added in v2`,
      },
    }));

    await savedObjectsRepository.bulkCreate(sampleAObjs);
  };

  it('migrates the documents', async () => {
    await createBaseline();

    const { runMigrations, client } = await getKibanaMigratorTestKit({
      ...getBaseMigratorParams(),
      logFilePath,
      types: [typeV1],
    });

    await runMigrations();

    const indices = await client.indices.get({ index: '.kibana*' });
    expect(Object.keys(indices)).toEqual(['.kibana_1']);

    const index = indices['.kibana_1'];
    const mappings = index.mappings ?? {};
    const mappingMeta = mappings._meta ?? {};

    // check that mappings are still matching v2
    expect(mappings.properties).toEqual(
      expect.objectContaining({
        sample_type: typeV2.mappings,
      })
    );

    // check that the mappingVersions are still v2
    expect(mappingMeta.mappingVersions).toEqual({
      sample_type: '10.2.0',
    });

    // check that the docVersion are still v2
    expect(mappingMeta.docVersions).toEqual({
      sample_type: '10.2.0',
    });

    await expect(
      client.count({ index: '.kibana_1', query: { term: { type: 'sample_type' } } })
    ).resolves.toHaveProperty('count', 5);

    const records = await parseLogFile(logFilePath);

    expect(records).toContainLogEntries(
      [
        'INIT -> INDEX_STATE_UPDATE_DONE',
        'INDEX_STATE_UPDATE_DONE -> DOCUMENTS_UPDATE_INIT',
        'DOCUMENTS_UPDATE_INIT -> DONE',
        'Migration completed',
      ],
      { ordered: true }
    );
  });
});
