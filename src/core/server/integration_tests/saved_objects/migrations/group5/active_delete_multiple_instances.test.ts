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
import { SemVer } from 'semver';
import { Env } from '@kbn/config';
import { getEnvOptions } from '@kbn/config-mocks';
import { REPO_ROOT } from '@kbn/repo-info';
import { type TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { SavedObjectsBulkCreateObject } from '@kbn/core-saved-objects-api-server';
import { DEFAULT_INDEX_TYPES_MAP } from '@kbn/core-saved-objects-base-server-internal';
import {
  defaultLogFilePath,
  getEsClient,
  getKibanaMigratorTestKit,
  startElasticsearch,
} from '../kibana_migrator_test_kit';
import { baselineTypes } from './active_delete.fixtures';
import { createBaselineArchive } from '../kibana_migrator_archive_utils';

const PARALLEL_MIGRATORS = 6;
const DOCUMENTS_PER_TYPE = 250000;

const kibanaIndex = '.kibana_migrator_tests';
const currentVersion = Env.createDefault(REPO_ROOT, getEnvOptions()).packageInfo.version;
const nextMinor = new SemVer(currentVersion).inc('minor').format();

const dataArchive = Path.join(__dirname, '..', 'archives', '1m_dummy_so.zip');

jest.setTimeout(24 * 3600 * 100);

describe('multiple migrator instances running in parallel', () => {
  it.skip('enable and focus this test (it.skip => fit), and run it, in order to create a baseline archive', async () => {
    // generate DOCUMENTS_PER_TYPE documents of each type
    const documents: SavedObjectsBulkCreateObject[] = ['server', 'basic', 'deprecated', 'complex']
      .map((type) =>
        new Array(DOCUMENTS_PER_TYPE).fill(true).map((_, index) => ({
          type,
          attributes: {
            name: `${type}-${++index}`,
            ...(type === 'complex' && { value: index }),
          },
        }))
      )
      .flat();

    await createBaselineArchive({ kibanaIndex, types: baselineTypes, documents, dataArchive });
  });

  describe('when upgrading to a new stack version with matching mappings', () => {
    let esServer: TestElasticsearchUtils['es'];
    let esClient: ElasticsearchClient;
    beforeAll(async () => {
      esServer = await startElasticsearch({ dataArchive });
      esClient = await getEsClient();
      await fs.unlink(defaultLogFilePath).catch(() => {});

      for (let i = 0; i < PARALLEL_MIGRATORS; ++i) {
        await fs.unlink(Path.join(__dirname, `active_delete_instance_${i}.log`)).catch(() => {});
      }
    });

    it('will actively delete and successfully complete migration', async () => {
      const startTime = Date.now();
      const types = baselineTypes
        .filter((type) => type.name !== 'deprecated')
        .map((type) => {
          if (type.name !== 'complex') {
            return type;
          }

          return {
            ...type,
            excludeOnUpgrade: () => {
              return {
                bool: {
                  must: [
                    { term: { type: 'complex' } },
                    { range: { 'complex.value': { lte: 125000 } } },
                  ],
                },
              };
            },
          };
        });

      const beforeCleanup = await getAggregatedTypesCount();
      expect(beforeCleanup.server).toEqual(DOCUMENTS_PER_TYPE);
      expect(beforeCleanup.basic).toEqual(DOCUMENTS_PER_TYPE);
      expect(beforeCleanup.deprecated).toEqual(DOCUMENTS_PER_TYPE);
      expect(beforeCleanup.complex).toEqual(DOCUMENTS_PER_TYPE);

      const testKits = await Promise.all(
        new Array(PARALLEL_MIGRATORS)
          .fill({
            settings: {
              migrations: {
                discardUnknownObjects: nextMinor,
              },
            },
            kibanaIndex,
            types,
            kibanaVersion: nextMinor,
          })
          .map((config, index) =>
            getKibanaMigratorTestKit({
              ...config,
              logFilePath: Path.join(__dirname, `active_delete_instance_${index}.log`),
              defaultIndexTypesMap: DEFAULT_INDEX_TYPES_MAP,
            })
          )
      );

      const results = await Promise.all(testKits.map((testKit) => testKit.runMigrations()));
      expect(results.flat().every((result) => result.status === 'migrated')).toEqual(true);

      for (let i = 0; i < PARALLEL_MIGRATORS; ++i) {
        const logs = await fs.readFile(
          Path.join(__dirname, `active_delete_instance_${i}.log`),
          'utf-8'
        );
        expect(logs).toMatch('CHECK_VERSION_INDEX_READY_ACTIONS -> DONE');
        expect(logs).toMatch('Migration completed');
      }

      const endTime = Date.now();
      // eslint-disable-next-line no-console
      console.debug(`Migration took: ${(endTime - startTime) / 1000} seconds`);

      // After cleanup
      const afterCleanup = await getAggregatedTypesCount();
      expect(afterCleanup.server).not.toBeDefined(); // 'server' is part of the REMOVED_TYPES
      expect(afterCleanup.basic).toEqual(DOCUMENTS_PER_TYPE); // we keep 'basic' SOs
      expect(afterCleanup.deprecated).not.toBeDefined(); // 'deprecated' is no longer present in nextMinor's mappings
      expect(afterCleanup.complex).toEqual(DOCUMENTS_PER_TYPE / 2); // we excludeFromUpgrade half of them with a hook
    });

    afterAll(async () => {
      // await esClient?.indices.delete({ index: `${kibanaIndex}_${currentVersion}_001` });
      await esServer?.stop();
    });

    const getAggregatedTypesCount = async () => {
      await esClient.indices.refresh();
      const response = await esClient.search<unknown, { typesAggregation: { buckets: any[] } }>({
        index: kibanaIndex,
        _source: false,
        aggs: {
          typesAggregation: {
            terms: {
              // assign type __UNKNOWN__ to those documents that don't define one
              missing: '__UNKNOWN__',
              field: 'type',
              size: 10,
            },
            aggs: {
              docs: {
                top_hits: {
                  size: 2,
                  _source: {
                    excludes: ['*'],
                  },
                },
              },
            },
          },
        },
      });

      return (response.aggregations!.typesAggregation.buckets as unknown as any).reduce(
        (acc: any, current: any) => {
          acc[current.key] = current.doc_count;
          return acc;
        },
        {}
      );
    };
  });
});
