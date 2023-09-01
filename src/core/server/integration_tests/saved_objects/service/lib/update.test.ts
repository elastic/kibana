/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import fs from 'fs/promises';
import { pick } from 'lodash';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { SavedObjectsType, SavedObjectsModelVersionMap } from '@kbn/core-saved-objects-server';
import { type TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import '../../migrations/jest_matchers';
import {
  getKibanaMigratorTestKit,
  startElasticsearch,
} from '../../migrations/kibana_migrator_test_kit';
import { delay } from '../../migrations/test_utils';
import { getBaseMigratorParams } from '../../migrations/fixtures/zdt_base.fixtures';

export const logFilePath = Path.join(__dirname, 'update.test.log');

describe('SOR - update API', () => {
  let esServer: TestElasticsearchUtils['es'];

  beforeAll(async () => {
    await fs.unlink(logFilePath).catch(() => {});
    esServer = await startElasticsearch();
  });

  const getType = (version: 'v1' | 'v2'): SavedObjectsType => {
    const versionMap: SavedObjectsModelVersionMap = {
      1: {
        changes: [],
        schemas: {
          forwardCompatibility: (attributes) => {
            return pick(attributes, 'count');
          },
        },
      },
    };

    if (version === 'v2') {
      versionMap[2] = {
        changes: [
          {
            type: 'data_backfill',
            backfillFn: (document) => {
              return { attributes: { even: document.attributes.count % 2 === 0 } };
            },
          },
        ],
      };
    }

    return {
      name: 'my-test-type',
      hidden: false,
      namespaceType: 'agnostic',
      mappings: {
        dynamic: false,
        properties: {
          count: { type: 'integer' },
          ...(version === 'v2' ? { even: { type: 'boolean' } } : {}),
        },
      },
      management: {
        importableAndExportable: true,
      },
      switchToModelVersionAt: '8.10.0',
      modelVersions: versionMap,
    };
  };

  afterAll(async () => {
    await esServer?.stop();
    await delay(10);
  });

  const setup = async () => {
    const { runMigrations: runMigrationV1, savedObjectsRepository: repositoryV1 } =
      await getKibanaMigratorTestKit({
        ...getBaseMigratorParams(),
        types: [getType('v1')],
      });
    await runMigrationV1();

    const {
      runMigrations: runMigrationV2,
      savedObjectsRepository: repositoryV2,
      client: esClient,
    } = await getKibanaMigratorTestKit({
      ...getBaseMigratorParams(),
      types: [getType('v2')],
    });
    await runMigrationV2();

    return { repositoryV1, repositoryV2, esClient };
  };

  it('supports updates between older and newer versions', async () => {
    const { repositoryV1, repositoryV2, esClient } = await setup();

    await repositoryV1.create('my-test-type', { count: 12 }, { id: 'my-id' });

    let document = await repositoryV2.get('my-test-type', 'my-id');

    expect(document.attributes).toEqual({
      count: 12,
      even: true,
    });

    await repositoryV2.update('my-test-type', 'my-id', {
      count: 11,
      even: false,
    });

    document = await repositoryV1.get('my-test-type', 'my-id');

    expect(document.attributes).toEqual({
      count: 11,
    });

    await repositoryV1.update('my-test-type', 'my-id', {
      count: 14,
    });

    document = await repositoryV2.get('my-test-type', 'my-id');

    expect(document.attributes).toEqual({
      count: 14,
      even: true,
    });

    const rawDoc = await fetchDoc(esClient, 'my-test-type', 'my-id');
    expect(rawDoc._source).toEqual(
      expect.objectContaining({
        typeMigrationVersion: '10.1.0',
        'my-test-type': {
          count: 14,
        },
      })
    );
  });

  const fetchDoc = async (client: ElasticsearchClient, type: string, id: string) => {
    return await client.get({
      index: '.kibana',
      id: `${type}:${id}`,
    });
  };
});
