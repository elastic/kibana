/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import type { Metadata } from '@elastic/elasticsearch/lib/api/types';
import type { TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import type { MigrationResult } from '@kbn/core-saved-objects-base-server-internal';
import { MAIN_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import {
  clearLog,
  deleteSavedObjectIndices,
  getKibanaMigratorTestKit,
  readLog,
  startElasticsearch,
} from '../kibana_migrator_test_kit';
import { delay, createType } from '../test_utils';
import '../jest_matchers';

const logFilePath = Path.join(__dirname, 'v2_md5_to_mv.test.log');

const SOME_TYPE = createType({
  switchToModelVersionAt: '8.10.0',
  name: 'some-type',
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

const ANOTHER_TYPE = createType({
  switchToModelVersionAt: '8.10.0',
  name: 'another-type',
  modelVersions: {
    '1': {
      changes: [],
    },
  },
  mappings: {
    properties: {
      field1: { type: 'integer' },
      field2: { type: 'integer' },
    },
  },
});
const ANOTHER_TYPE_UPDATED = createType({
  switchToModelVersionAt: '8.10.0',
  name: 'another-type',
  modelVersions: {
    '1': {
      changes: [],
    },
    '2': {
      changes: [
        {
          type: 'mappings_addition',
          addedMappings: {
            field3: { type: 'keyword' },
          },
        },
      ],
    },
  },
  mappings: {
    properties: {
      field1: { type: 'integer' },
      field2: { type: 'integer' },
      field3: { type: 'keyword' },
    },
  },
});

const TYPE_WITHOUT_MODEL_VERSIONS = createType({
  name: 'no-mv-type',
  mappings: {
    properties: {
      title: { type: 'text' },
    },
  },
});

const SOME_TYPE_HASH = 'someLongHashThatWeCanImagineWasCalculatedUsingMd5';
const ANOTHER_TYPE_HASH = 'differentFromTheOneAboveAsTheRelatedTypeFieldsAreIntegers';
const A_THIRD_HASH = 'yetAnotherHashUsedByTypeWithoutModelVersions';
const HASH_TO_VERSION_MAP: Record<string, string> = {};
HASH_TO_VERSION_MAP[`some-type|${SOME_TYPE_HASH}`] = '10.1.0';
// simulate that transition to modelVersion happened before 'another-type' was updated
HASH_TO_VERSION_MAP[`another-type|${ANOTHER_TYPE_HASH}`] = '10.1.0';
HASH_TO_VERSION_MAP[`no-mv-type|${A_THIRD_HASH}`] = '0.0.0';

describe('V2 algorithm', () => {
  let esServer: TestElasticsearchUtils['es'];
  let esClient: ElasticsearchClient;
  let result: MigrationResult[];

  const getMappingMeta = async () => {
    const mapping = await esClient.indices.getMapping({ index: MAIN_SAVED_OBJECT_INDEX });
    return Object.values(mapping)[0].mappings._meta;
  };

  beforeAll(async () => {
    // clean ES startup
    esServer = await startElasticsearch();
  });

  describe('when started on a fresh ES deployment', () => {
    beforeAll(async () => {
      const { runMigrations, client } = await getKibanaMigratorTestKit({
        kibanaIndex: MAIN_SAVED_OBJECT_INDEX,
        types: [SOME_TYPE, ANOTHER_TYPE, TYPE_WITHOUT_MODEL_VERSIONS],
        logFilePath,
      });
      esClient = client;

      // misc cleanup
      await clearLog(logFilePath);
      await deleteSavedObjectIndices(client);

      result = await runMigrations();
    });

    it('creates the SO indices, storing modelVersions in meta.mappingVersions', async () => {
      expect(result[0].status === 'skipped');
      expect(await getMappingMeta()).toEqual({
        indexTypesMap: {
          '.kibana': ['another-type', 'no-mv-type', 'some-type'],
        },
        mappingVersions: {
          'another-type': '10.1.0',
          'no-mv-type': '0.0.0',
          'some-type': '10.1.0',
        },
      });
    });

    describe('when upgrading to a more recent version', () => {
      let indexMetaAfterMigration: Metadata | undefined;

      beforeAll(async () => {
        // start the migrator again, which will update meta with modelVersions
        const { runMigrations: restartKibana } = await getKibanaMigratorTestKit({
          kibanaIndex: MAIN_SAVED_OBJECT_INDEX,
          // note that we are updating 'another-type'
          types: [SOME_TYPE, ANOTHER_TYPE_UPDATED, TYPE_WITHOUT_MODEL_VERSIONS],
          hashToVersionMap: HASH_TO_VERSION_MAP,
          logFilePath,
        });

        result = await restartKibana();

        indexMetaAfterMigration = await getMappingMeta();
      });

      it('performs a compatible (non-reindexing) migration', () => {
        expect(result[0].status).toEqual('patched');
      });

      it('updates the SO indices meta.mappingVersions with the appropriate model versions', () => {
        expect(indexMetaAfterMigration?.mappingVersions).toEqual({
          'some-type': '10.1.0',
          'another-type': '10.2.0',
          'no-mv-type': '0.0.0',
        });
      });

      it('stores a breakdown of indices => types in the meta', () => {
        expect(indexMetaAfterMigration?.indexTypesMap).toEqual({
          '.kibana': ['another-type', 'no-mv-type', 'some-type'],
        });
      });

      it('only "picks up" the types that have changed', async () => {
        const logs = await readLog(logFilePath);
        expect(logs).toMatch(
          'Kibana is performing a compatible upgrade and NO root fields have been updated. Kibana will update the following SO types so that ES can pickup the updated mappings: another-type.'
        );
      });
    });
  });

  describe('when SO indices still contain md5 hashes', () => {
    let indexMetaAfterMigration: Metadata | undefined;

    beforeAll(async () => {
      const { runMigrations, client } = await getKibanaMigratorTestKit({
        kibanaIndex: MAIN_SAVED_OBJECT_INDEX,
        types: [SOME_TYPE, ANOTHER_TYPE, TYPE_WITHOUT_MODEL_VERSIONS],
        logFilePath,
      });
      esClient = client;

      // misc cleanup
      await clearLog(logFilePath);
      await deleteSavedObjectIndices(client);

      await runMigrations();

      // we update the mappings to mimic an "md5 state"
      await client.indices.putMapping({
        index: MAIN_SAVED_OBJECT_INDEX,
        _meta: {
          migrationMappingPropertyHashes: {
            'some-type': SOME_TYPE_HASH,
            'another-type': ANOTHER_TYPE_HASH,
            'no-mv-type': A_THIRD_HASH,
          },
        },
        allow_no_indices: true,
      });

      // we then start the migrator again, which will update meta with modelVersions
      const { runMigrations: restartKibana } = await getKibanaMigratorTestKit({
        kibanaIndex: MAIN_SAVED_OBJECT_INDEX,
        // note that we are updating 'another-type'
        types: [SOME_TYPE, ANOTHER_TYPE_UPDATED, TYPE_WITHOUT_MODEL_VERSIONS],
        hashToVersionMap: HASH_TO_VERSION_MAP,
        logFilePath,
      });

      result = await restartKibana();

      indexMetaAfterMigration = await getMappingMeta();
    });

    it('performs a compatible (non-reindexing) migration', () => {
      expect(result[0].status).toEqual('patched');
    });

    it('preserves the SO indices meta.migrationMappingPropertyHashes (although they are no longer up to date / in use)', () => {
      expect(indexMetaAfterMigration?.migrationMappingPropertyHashes).toEqual({
        'another-type': 'differentFromTheOneAboveAsTheRelatedTypeFieldsAreIntegers',
        'no-mv-type': 'yetAnotherHashUsedByTypeWithoutModelVersions',
        'some-type': 'someLongHashThatWeCanImagineWasCalculatedUsingMd5',
      });
    });

    it('adds the mappingVersions with the current modelVersions', () => {
      expect(indexMetaAfterMigration?.mappingVersions).toEqual({
        'another-type': '10.2.0',
        'no-mv-type': '0.0.0',
        'some-type': '10.1.0',
      });
    });

    it('stores a breakdown of indices => types in the meta', () => {
      expect(indexMetaAfterMigration?.indexTypesMap).toEqual({
        '.kibana': ['another-type', 'no-mv-type', 'some-type'],
      });
    });

    it('only "picks up" the types that have changed', async () => {
      const logs = await readLog(logFilePath);
      expect(logs).toMatch(
        'Kibana is performing a compatible upgrade and NO root fields have been updated. Kibana will update the following SO types so that ES can pickup the updated mappings: another-type.'
      );
    });
  });

  afterAll(async () => {
    await esServer?.stop();
    await delay(10);
  });
});
