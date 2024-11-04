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
import { pick } from 'lodash';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { SavedObjectsType, SavedObjectsModelVersionMap } from '@kbn/core-saved-objects-server';
import { type TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import '../../migrations/jest_matchers';
import {
  getKibanaMigratorTestKit,
  startElasticsearch,
} from '../../migrations/kibana_migrator_test_kit';
import { getBaseMigratorParams } from '../../migrations/fixtures/zdt_base.fixtures';

export const logFilePath = Path.join(__dirname, 'bulk_update.test.log');

describe('SOR - bulk_update API', () => {
  let esServer: TestElasticsearchUtils['es'];

  beforeAll(async () => {
    await fs.unlink(logFilePath).catch(() => {});
    esServer = await startElasticsearch();
  });

  afterAll(async () => {
    await esServer?.stop();
  });

  const getCrossVersionType = (version: 'v1' | 'v2'): SavedObjectsType => {
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

  const getOtherType = (version: 'v1' | 'v2'): SavedObjectsType => {
    const versionOtherMap: SavedObjectsModelVersionMap = {
      1: {
        changes: [],
        schemas: {
          forwardCompatibility: (attributes) => {
            return pick(attributes, 'sum');
          },
        },
      },
    };

    if (version === 'v2') {
      versionOtherMap[2] = {
        changes: [
          {
            type: 'data_backfill',
            backfillFn: (document) => {
              return { attributes: { isodd: document.attributes.sum % 2 !== 0 } };
            },
          },
        ],
      };
    }

    return {
      name: 'my-other-test-type',
      hidden: false,
      namespaceType: 'agnostic',
      mappings: {
        dynamic: false,
        properties: {
          sum: { type: 'integer' },
          ...(version === 'v2' ? { isodd: { type: 'boolean' } } : {}),
        },
      },
      management: {
        importableAndExportable: true,
      },
      switchToModelVersionAt: '8.10.0',
      modelVersions: versionOtherMap,
    };
  };

  const getFullUpdateType = (): SavedObjectsType => {
    return {
      name: 'update-test-type',
      hidden: false,
      namespaceType: 'single',
      mappings: {
        dynamic: false,
        properties: {},
      },
      management: {
        importableAndExportable: true,
      },
      switchToModelVersionAt: '8.10.0',
      modelVersions: {},
    };
  };

  const setup = async () => {
    const { runMigrations: runMigrationV1, savedObjectsRepository: repositoryV1 } =
      await getKibanaMigratorTestKit({
        ...getBaseMigratorParams(),
        types: [getCrossVersionType('v1'), getOtherType('v1')],
      });
    await runMigrationV1();

    const {
      runMigrations: runMigrationV2,
      savedObjectsRepository: repositoryV2,
      client: esClient,
    } = await getKibanaMigratorTestKit({
      ...getBaseMigratorParams(),
      types: [getCrossVersionType('v2'), getOtherType('v2'), getFullUpdateType()],
    });
    await runMigrationV2();

    return { repositoryV1, repositoryV2, esClient };
  };

  it('supports updates between older and newer versions', async () => {
    const { repositoryV1, repositoryV2, esClient } = await setup();

    await repositoryV1.create('my-test-type', { count: 12 }, { id: 'my-id' });
    await repositoryV1.create('my-other-test-type', { sum: 24 }, { id: 'my-other-id' });

    let repoV2Docs = await repositoryV2.bulkGet([
      { type: 'my-test-type', id: 'my-id' },
      { type: 'my-other-test-type', id: 'my-other-id' },
    ]);
    const [doc, otherDoc] = repoV2Docs.saved_objects;

    expect(doc.attributes).toEqual({
      count: 12,
      even: true,
    });
    expect(otherDoc.attributes).toEqual({
      sum: 24,
      isodd: false,
    });

    await repositoryV2.bulkUpdate([
      { type: 'my-test-type', id: doc.id, attributes: { count: 11, even: false } },
      // @ts-expect-error cannot assign to partial
      { type: 'my-other-test-type', id: otherDoc.id, attributes: { sum: 23, isodd: true } },
    ]);

    const repoV1Docs = await repositoryV1.bulkGet([
      { type: 'my-test-type', id: 'my-id' },
      { type: 'my-other-test-type', id: 'my-other-id' },
    ]);
    const [doc1, otherDoc1] = repoV1Docs.saved_objects;

    expect(doc1.attributes).toEqual({
      count: 11,
    });
    expect(otherDoc1.attributes).toEqual({
      sum: 23,
    });

    await repositoryV1.bulkUpdate([
      { type: 'my-test-type', id: doc1.id, attributes: { count: 14 } },
      // @ts-expect-error cannot assign to partial
      { type: 'my-other-test-type', id: otherDoc1.id, attributes: { sum: 24 } },
    ]);

    repoV2Docs = await repositoryV2.bulkGet([
      { type: 'my-test-type', id: 'my-id' },
      { type: 'my-other-test-type', id: 'my-other-id' },
    ]);
    const [doc2, otherDoc2] = repoV2Docs.saved_objects;

    expect(doc2.attributes).toEqual({
      count: 14,
      even: true,
    });
    expect(otherDoc2.attributes).toEqual({
      sum: 24,
      isodd: false,
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

    const otherRawDoc = await fetchDoc(esClient, 'my-other-test-type', 'my-other-id');
    expect(otherRawDoc._source).toEqual(
      expect.objectContaining({
        typeMigrationVersion: '10.1.0',
        'my-other-test-type': {
          sum: 24,
        },
      })
    );
  });

  it('supports update with attributes override', async () => {
    const { repositoryV2: repository } = await setup();

    await repository.create('update-test-type', { foo: 'bar' }, { id: 'my-id' });

    let docs = await repository.bulkGet([{ type: 'update-test-type', id: 'my-id' }]);
    const [doc] = docs.saved_objects;

    expect(doc.attributes).toEqual({
      foo: 'bar',
    });

    await repository.bulkUpdate([
      { type: 'update-test-type', id: doc.id, attributes: { hello: 'dolly' } },
    ]);

    docs = await repository.bulkGet([{ type: 'update-test-type', id: 'my-id' }]);
    const [doc1] = docs.saved_objects;

    expect(doc1.attributes).toEqual({
      foo: 'bar',
      hello: 'dolly',
    });

    await repository.bulkUpdate([
      {
        type: 'update-test-type',
        id: doc1.id,
        attributes: {
          over: '9000',
        },
        mergeAttributes: false,
      },
    ]);

    docs = await repository.bulkGet([{ type: 'update-test-type', id: 'my-id' }]);
    const [doc2] = docs.saved_objects;

    expect(doc2.attributes).toEqual({
      over: '9000',
    });
  });

  const fetchDoc = async (client: ElasticsearchClient, type: string, id: string) => {
    return await client.get({
      index: '.kibana',
      id: `${type}:${id}`,
    });
  };
});
