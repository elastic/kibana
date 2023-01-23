/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import Path from 'path';
import fs from 'fs/promises';
import { Env } from '@kbn/config';
import { getEnvOptions } from '@kbn/config-mocks';
import { REPO_ROOT } from '@kbn/repo-info';
import type { Root } from '@kbn/core-root-server-internal';
import {
  createRootWithCorePlugins,
  createTestServers,
  type TestElasticsearchUtils,
} from '@kbn/core-test-helpers-kbn-server';
import { delay } from './test_utils';
import { SemVer } from 'semver';

const logFilePath = Path.join(__dirname, 'skip_reindex.log');

describe('when migrating to a new version', () => {
  const currentVersion = Env.createDefault(REPO_ROOT, getEnvOptions()).packageInfo.version;
  let esServer: TestElasticsearchUtils['es'];
  let root: Root;

  beforeEach(async () => {
    await fs.unlink(logFilePath).catch(() => {});
  });

  afterEach(async () => {
    await root?.shutdown();
    await esServer?.stop();
    await delay(10);
  });

  describe('and the mappings remain the same', () => {
    it('the migrator skips reindexing', async () => {
      let logs: string;
      const { startES } = createTestServers({
        adjustTimeout: (t: number) => jest.setTimeout(t),
        settings: {
          es: {
            license: 'basic',
          },
        },
      });
      esServer = await startES();
      root = createRoot();

      // Run initial migrations
      await root.preboot();
      await root.setup();
      await root.start();

      // stop Kibana and remove logs
      await root.shutdown();
      await delay(10);
      await fs.unlink(logFilePath).catch(() => {});

      const nextPatch = new SemVer(currentVersion).inc('patch').format();
      root = createRoot(nextPatch);
      await root.preboot();
      await root.setup();
      await root.start();

      logs = await fs.readFile(logFilePath, 'utf-8');

      expect(logs).toMatch('[.kibana] INIT -> WAIT_FOR_YELLOW_SOURCE');
      expect(logs).toMatch('[.kibana] WAIT_FOR_YELLOW_SOURCE -> PREPARE_COMPATIBLE_MIGRATION');
      expect(logs).toMatch(
        '[.kibana] PREPARE_COMPATIBLE_MIGRATION -> OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT'
      );
      expect(logs).toMatch('[.kibana] CHECK_TARGET_MAPPINGS -> CHECK_VERSION_INDEX_READY_ACTIONS');
      expect(logs).toMatch('[.kibana] CHECK_VERSION_INDEX_READY_ACTIONS -> DONE');

      expect(logs).not.toMatch('[.kibana] CREATE_NEW_TARGET');
      expect(logs).not.toMatch('[.kibana] CHECK_TARGET_MAPPINGS -> UPDATE_TARGET_MAPPINGS');

      // We restart Kibana again after doing a "compatible migration" to ensure that
      // the next time state is loaded everything still works as expected.
      // For instance, we might see something like:
      // Unable to complete saved object migrations for the [.kibana] index. Please check the health of your Elasticsearch cluster and try again. Unexpected Elasticsearch ResponseError: statusCode: 404, method: POST, url: /.kibana_8.7.1_001/_pit?keep_alive=10m error: [index_not_found_exception]: no such index [.kibana_8.7.1_001]
      await root.shutdown();
      await delay(10);
      await fs.unlink(logFilePath).catch(() => {});

      root = createRoot(nextPatch);
      await root.preboot();
      await root.setup();
      await root.start();

      logs = await fs.readFile(logFilePath, 'utf-8');
      expect(logs).toMatch('[.kibana] INIT -> OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT');
      expect(logs).not.toMatch('[.kibana] INIT -> PREPARE_COMPATIBLE_MIGRATION');
      expect(logs).not.toMatch('[.kibana] UPDATE_TARGET_MAPPINGS');
    });
  });

  describe("and the mappings' changes are still compatible", () => {
    it('the migrator skips reindexing', async () => {
      // we emulate this behavior by altering the stored mappings' hashes
      // causing diffMappings to believe that the mappings have changed
    });
  });

  describe("and the mappings' changes are NOT compatible", () => {
    it('the migrator reindexes documents to a new index', async () => {
      let logs: string;

      // load an older version with uncompatible mappings for the .kibana_task_manager index (8.4.0 vs 8.7.0)
      const { startES } = createTestServers({
        adjustTimeout: (t: number) => jest.setTimeout(t),
        settings: {
          es: {
            license: 'basic',
            // this package alters a few mappings in an incompatible fashion
            // usageCollection.mappings.domainId: keyword => text
            // cases.mappings.duration: unsigned_long => integer
            // cases.mappings.description: text => keyword
            dataArchive: Path.join(__dirname, 'archives', '8.6.1_mappings_altered.zip'),
          },
        },
      });

      esServer = await startES();

      root = createRoot();
      await root.preboot();
      await root.setup();
      await root.start();

      logs = await fs.readFile(logFilePath, 'utf-8');

      expect(logs).toMatch('[.kibana] INIT -> WAIT_FOR_YELLOW_SOURCE');
      expect(logs).toMatch('[.kibana] WAIT_FOR_YELLOW_SOURCE -> CHECK_COMPATIBLE_MAPPINGS');
      expect(logs).toMatch('[.kibana] CHECK_COMPATIBLE_MAPPINGS -> CHECK_UNKNOWN_DOCUMENTS');
      expect(logs).toMatch('[.kibana] CREATE_REINDEX_TEMP');
      expect(logs).toMatch('[.kibana] CHECK_TARGET_MAPPINGS -> UPDATE_TARGET_MAPPINGS');

      expect(logs).not.toMatch('[.kibana] PREPARE_COMPATIBLE_MAPPINGS');

      // We restart Kibana again after doing a "compatible migration" to ensure that
      // the next time state is loaded everything still works as expected.
      // For instance, we might see something like:
      // Unable to complete saved object migrations for the [.kibana] index. Please check the health of your Elasticsearch cluster and try again. Unexpected Elasticsearch ResponseError: statusCode: 404, method: POST, url: /.kibana_8.7.1_001/_pit?keep_alive=10m error: [index_not_found_exception]: no such index [.kibana_8.7.1_001]
      await root.shutdown();
      await delay(10);
      await fs.unlink(logFilePath).catch(() => {});

      root = createRoot();
      await root.preboot();
      await root.setup();
      await root.start();

      logs = await fs.readFile(logFilePath, 'utf-8');
      expect(logs).toMatch('[.kibana] INIT -> OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT');
      expect(logs).not.toMatch('[.kibana] INIT -> PREPARE_COMPATIBLE_MIGRATION');
      expect(logs).not.toMatch('[.kibana] UPDATE_TARGET_MAPPINGS');
    });
  });
});

function createRoot(kibanaVersion?: string): Root {
  return createRootWithCorePlugins(
    {
      logging: {
        appenders: {
          file: {
            type: 'file',
            fileName: logFilePath,
            layout: {
              type: 'json',
            },
          },
        },
        loggers: [
          {
            name: 'root',
            level: 'info',
            appenders: ['file'],
          },
        ],
      },
    },
    { oss: true },
    kibanaVersion
  );
}
