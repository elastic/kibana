/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import fs from 'fs/promises';
import { type TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import '../jest_matchers';
import { SavedObjectsModelVersionMap, SavedObject } from '@kbn/core-saved-objects-server';
import { getKibanaMigratorTestKit, startElasticsearch } from '../kibana_migrator_test_kit';
import { createType } from '../test_utils';
import { getBaseMigratorParams } from '../fixtures/zdt_base.fixtures';
import {
  SavedObjectsSerializer,
  SavedObjectTypeRegistry,
  modelVersionToVirtualVersion,
} from '@kbn/core-saved-objects-base-server-internal';
import { getOutdatedDocumentsQuery } from '@kbn/core-saved-objects-migration-server-internal/src/zdt/utils';

export const logFilePath = Path.join(__dirname, 'outdated_doc_query.test.log');

describe('getOutdatedDocumentsQuery', () => {
  let esServer: TestElasticsearchUtils['es'];

  const getTestType = ({ includeHigherVersions }: { includeHigherVersions: boolean }) => {
    const modelVersions: SavedObjectsModelVersionMap = {
      1: {
        changes: [],
      },
      2: {
        changes: [],
      },
      3: {
        changes: [],
      },
    };
    if (includeHigherVersions) {
      Object.assign(modelVersions, {
        4: {
          changes: [],
        },
        5: {
          changes: [],
        },
      });
    }

    return createType({
      name: 'test-type',
      switchToModelVersionAt: '8.0.0',
      modelVersions,
      mappings: {
        dynamic: false,
        properties: {
          text: { type: 'text' },
          bool: { type: 'boolean' },
        },
      },
    });
  };

  const createBaseline = async () => {
    const testTypeWithoutHigherVersion = getTestType({ includeHigherVersions: false });
    const testTypeWithHigherVersion = getTestType({ includeHigherVersions: true });

    const { runMigrations, client } = await getKibanaMigratorTestKit({
      ...getBaseMigratorParams(),
      logFilePath,
      types: [testTypeWithoutHigherVersion],
    });
    await runMigrations();

    const typeRegistry = new SavedObjectTypeRegistry();
    typeRegistry.registerType(testTypeWithHigherVersion);
    const serializer = new SavedObjectsSerializer(typeRegistry);

    const bulkCreateParams: object[] = [];
    for (let i = 1; i <= 5; i++) {
      const so: SavedObject = {
        type: 'test-type',
        id: `doc-v${i}`,
        attributes: {},
        references: [],
        typeMigrationVersion: modelVersionToVirtualVersion(i),
      };
      const raw = serializer.savedObjectToRaw(so);
      bulkCreateParams.push(
        {
          create: {
            _id: raw._id,
            _index: '.kibana',
          },
        },
        raw._source
      );
    }

    await client.bulk({
      refresh: 'true',
      body: bulkCreateParams,
    });

    return { client };
  };

  beforeAll(async () => {
    await fs.unlink(logFilePath).catch(() => {});
    esServer = await startElasticsearch();
  });

  afterAll(async () => {
    await esServer?.stop();
  });

  it('creates a query returning the expected documents', async () => {
    const { client } = await createBaseline();
    const testTypeWithoutHigherVersion = getTestType({ includeHigherVersions: false });
    const query = getOutdatedDocumentsQuery({ types: [testTypeWithoutHigherVersion] });

    const response = await client.search({
      index: '.kibana',
      query,
    });

    const docs = response.hits.hits;

    expect(docs).toHaveLength(2);
    expect(docs.map((doc) => doc._id).sort()).toEqual(['test-type:doc-v1', 'test-type:doc-v2']);
  });
});
