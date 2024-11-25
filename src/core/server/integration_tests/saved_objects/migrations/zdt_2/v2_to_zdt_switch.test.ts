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
import { IndexMappingMeta } from '@kbn/core-saved-objects-base-server-internal';
import '../jest_matchers';
import {
  getKibanaMigratorTestKit,
  startElasticsearch,
  currentVersion,
} from '../kibana_migrator_test_kit';
import { parseLogFile } from '../test_utils';
import { getBaseMigratorParams, getSampleAType } from '../fixtures/zdt_base.fixtures';

export const logFilePath = Path.join(__dirname, 'v2_to_zdt_switch.test.log');

const v2IndexName = `.kibana_${currentVersion}_001`;

describe('ZDT upgrades - switching from v2 algorithm', () => {
  let esServer: TestElasticsearchUtils['es'];

  beforeEach(async () => {
    await fs.unlink(logFilePath).catch(() => {});
    esServer = await startElasticsearch();
  });

  afterEach(async () => {
    await esServer?.stop();
  });

  const createBaseline = async ({
    kibanaVersion = currentVersion,
  }: { kibanaVersion?: string } = {}) => {
    const { runMigrations, savedObjectsRepository, client } = await getKibanaMigratorTestKit({
      ...getBaseMigratorParams({ migrationAlgorithm: 'v2', kibanaVersion }),
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

    return { client };
  };

  describe('when switching from a compatible version', () => {
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

      const { saved_objects: sampleADocs } = await savedObjectsRepository.find({
        type: 'sample_a',
      });

      expect(sampleADocs).toHaveLength(5);

      const records = await parseLogFile(logFilePath);
      expect(records).toContainLogEntries(
        [
          'INIT: current algo check result: v2-partially-migrated',
          'INIT: mapping version check result: equal',
          'INIT -> INDEX_STATE_UPDATE_DONE',
          'INDEX_STATE_UPDATE_DONE -> DOCUMENTS_UPDATE_INIT',
          'Migration completed',
        ],
        { ordered: true }
      );
    });
  });

  describe('when switching from an incompatible version', () => {
    it('fails and throws an explicit error', async () => {
      const { client } = await createBaseline({ kibanaVersion: '8.7.0' });

      // even when specifying an older version, `indexTypeMap` and `mappingVersions` will be present on the index's meta,
      // so we have to manually remove them.
      const indices = await client.indices.get({
        index: '.kibana_8.7.0_001',
      });
      const meta = indices['.kibana_8.7.0_001'].mappings!._meta! as IndexMappingMeta;
      delete meta.indexTypesMap;
      delete meta.mappingVersions;
      meta.migrationMappingPropertyHashes = {
        sample_a: 'sampleAHash',
      };
      await client.indices.putMapping({
        index: '.kibana_8.7.0_001',
        _meta: meta,
      });

      const typeA = getSampleAType();
      const { runMigrations } = await getKibanaMigratorTestKit({
        ...getBaseMigratorParams({ migrationAlgorithm: 'zdt' }),
        logFilePath,
        types: [typeA],
      });

      await expect(runMigrations()).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Unable to complete saved object migrations for the [.kibana] index: Index .kibana_8.7.0_001 is using an incompatible version of the v2 algorithm"`
      );

      const records = await parseLogFile(logFilePath);
      expect(records).toContainLogEntries(
        ['current algo check result: v2-incompatible', 'INIT -> FATAL'],
        { ordered: true }
      );
    });
  });
});
