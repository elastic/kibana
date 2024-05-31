/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import type { TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import {
  clearLog,
  createBaseline,
  defaultKibanaIndex,
  getCompatibleMappingsMigrator,
  getIdenticalMappingsMigrator,
  getIncompatibleMappingsMigrator,
  startElasticsearch,
} from '../kibana_migrator_test_kit';
import '../jest_matchers';
import { delay, parseLogFile } from '../test_utils';

export const logFilePath = Path.join(__dirname, 'pickup_updated_types_only.test.log');

describe('pickupUpdatedMappings', () => {
  let esServer: TestElasticsearchUtils['es'];

  beforeAll(async () => {
    esServer = await startElasticsearch();
  });

  beforeEach(async () => {
    await createBaseline();
    await clearLog(logFilePath);
  });

  describe('when performing a reindexing migration', () => {
    it('should pickup all documents from the index', async () => {
      const { runMigrations } = await getIncompatibleMappingsMigrator({ logFilePath });

      await runMigrations();

      const logs = await parseLogFile(logFilePath);

      expect(logs).not.toContainLogEntry('Documents of the following SO types will be updated');
      expect(logs).not.toContainLogEntry(
        'There are no changes in the mappings of any of the SO types, skipping UPDATE_TARGET_MAPPINGS steps.'
      );
    });
  });

  describe('when performing a compatible migration', () => {
    it('should pickup only the types that have been updated', async () => {
      const { runMigrations } = await getCompatibleMappingsMigrator({ logFilePath });

      await runMigrations();

      const logs = await parseLogFile(logFilePath);

      expect(logs).toContainLogEntry(
        'Documents of the following SO types will be updated, so that ES can pickup the updated mappings: complex.'
      );
    });

    it('should NOT pickup any documents if only root fields have been updated', async () => {
      const { runMigrations, client } = await getIdenticalMappingsMigrator({ logFilePath });

      // we tamper the baseline mappings to simulate some root fields changes
      const baselineMappings = await client.indices.getMapping({ index: defaultKibanaIndex });
      const properties = Object.values(baselineMappings)[0].mappings.properties!;
      (properties.references as any).properties.description = {
        type: 'text',
      };
      await client.indices.putMapping({ index: defaultKibanaIndex, properties });

      await runMigrations();

      const logs = await parseLogFile(logFilePath);

      expect(logs).toContainLogEntry(
        'There are no changes in the mappings of any of the SO types, skipping UPDATE_TARGET_MAPPINGS steps.'
      );
      expect(logs).not.toContainLogEntry('Documents of the following SO types will be updated');
    });
  });

  afterAll(async () => {
    await esServer?.stop();
    await delay(2);
  });
});
