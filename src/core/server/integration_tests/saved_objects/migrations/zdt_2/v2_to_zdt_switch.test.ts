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
import {
  getKibanaMigratorTestKit,
  startElasticsearch,
  currentVersion,
} from '../kibana_migrator_test_kit';
import { delay, parseLogFile } from '../test_utils';
import { getBaseMigratorParams, getSampleAType } from '../fixtures/zdt_base.fixtures';

export const logFilePath = Path.join(__dirname, 'v2_to_zdt_switch.test.log');

const v2IndexName = `.kibana_${currentVersion}_001`;

describe('ZDT upgrades - switching from v2 algorithm', () => {
  let esServer: TestElasticsearchUtils['es'];

  beforeAll(async () => {
    await fs.unlink(logFilePath).catch(() => {});
    esServer = await startElasticsearch();
  });

  afterAll(async () => {
    await esServer?.stop();
    await delay(10);
  });

  const createBaseline = async () => {
    const { runMigrations, savedObjectsRepository } = await getKibanaMigratorTestKit({
      ...getBaseMigratorParams({ migrationAlgorithm: 'v2' }),
      types: [getSampleAType()],
    });
    await runMigrations();

    const sampleAObjs = range(5).map<SavedObjectsBulkCreateObject>((number) => ({
      id: `a-${number}`,
      type: 'sample_a',
      attributes: {
        keyword: `a_${number}`,
        boolean: true,
      },
    }));

    await savedObjectsRepository.bulkCreate(sampleAObjs);
  };

  it('it able to re-use a cluster state from the v2 algorithm', async () => {
    await createBaseline();

    const typeA = getSampleAType();

    const { runMigrations, client, savedObjectsRepository } = await getKibanaMigratorTestKit({
      ...getBaseMigratorParams({ migrationAlgorithm: 'zdt' }),
      logFilePath,
      types: [typeA],
    });

    await runMigrations();

    const indices = await client.indices.get({ index: '.kibana*' });
    expect(Object.keys(indices)).toEqual([v2IndexName]);

    const index = indices[v2IndexName];
    const mappings = index.mappings ?? {};
    const mappingMeta = mappings._meta ?? {};

    expect(mappings.properties).toEqual(
      expect.objectContaining({
        sample_a: typeA.mappings,
      })
    );

    expect(mappingMeta).toEqual({
      docVersions: { sample_a: '10.1.0' },
      mappingVersions: { sample_a: '10.1.0' },
      migrationState: expect.any(Object),
    });

    const { saved_objects: sampleADocs } = await savedObjectsRepository.find({ type: 'sample_a' });

    expect(sampleADocs).toHaveLength(5);

    const records = await parseLogFile(logFilePath);
    expect(records).toContainLogEntries(
      [
        'INIT: current algo check result: v2-compatible',
        'INIT -> UPDATE_INDEX_MAPPINGS',
        'INDEX_STATE_UPDATE_DONE -> DOCUMENTS_UPDATE_INIT',
        'Migration completed',
      ],
      { ordered: true }
    );
  });
});
