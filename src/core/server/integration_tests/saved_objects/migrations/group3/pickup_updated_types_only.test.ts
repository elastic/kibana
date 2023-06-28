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
  currentVersion,
  defaultKibanaIndex,
  defaultLogFilePath,
  getCompatibleMappingsMigrator,
  getIncompatibleMappingsMigrator,
  startElasticsearch,
} from '../kibana_migrator_test_kit';
import '../jest_matchers';
import { delay, parseLogFile } from '../test_utils';
import { IndexMappingMeta } from '@kbn/core-saved-objects-base-server-internal';

export const logFilePath = Path.join(__dirname, 'pickup_updated_types_only.test.log');

describe('pickupUpdatedMappings', () => {
  let esServer: TestElasticsearchUtils['es'];

  beforeAll(async () => {
    esServer = await startElasticsearch();
  });

  beforeEach(async () => {
    await createBaseline();
    await clearLog();
  });

  describe('when performing a reindexing migration', () => {
    it('should pickup all documents from the index', async () => {
      const { runMigrations } = await getIncompatibleMappingsMigrator();

      await runMigrations();

      const logs = await parseLogFile(defaultLogFilePath);

      expect(logs).not.toContainLogEntry(
        'Kibana is performing a compatible upgrade and NO root fields have been udpated. Kibana will update the following SO types so that ES can pickup the updated mappings'
      );
    });
  });

  describe('when performing a compatible migration', () => {
    it('should pickup only the types that have been updated', async () => {
      const { runMigrations } = await getCompatibleMappingsMigrator();

      await runMigrations();

      const logs = await parseLogFile(defaultLogFilePath);

      expect(logs).toContainLogEntry(
        'Kibana is performing a compatible upgrade and NO root fields have been udpated. Kibana will update the following SO types so that ES can pickup the updated mappings: complex.'
      );
    });

    it('should pickup ALL documents if any root fields have been updated', async () => {
      const { runMigrations, client } = await getCompatibleMappingsMigrator();

      // we tamper the baseline mappings to simulate some root fields changes
      const baselineMappings = await client.indices.getMapping({ index: defaultKibanaIndex });
      const _meta = baselineMappings[`${defaultKibanaIndex}_${currentVersion}_001`].mappings
        ._meta as IndexMappingMeta;
      _meta.migrationMappingPropertyHashes!.namespace =
        _meta.migrationMappingPropertyHashes!.namespace + '_tampered';
      await client.indices.putMapping({ index: defaultKibanaIndex, _meta });

      await runMigrations();

      const logs = await parseLogFile(defaultLogFilePath);

      expect(logs).toContainLogEntry(
        'Kibana is performing a compatible upgrade and the mappings of some root fields have been changed. For Elasticsearch to pickup these mappings, all saved objects need to be updated. Updated root fields: namespace.'
      );
      expect(logs).not.toContainLogEntry(
        'Kibana is performing a compatible upgrade and NO root fields have been udpated. Kibana will update the following SO types so that ES can pickup the updated mappings'
      );
    });
  });

  afterAll(async () => {
    await esServer?.stop();
    await delay(2);
  });
});
