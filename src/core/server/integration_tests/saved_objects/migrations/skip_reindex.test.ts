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

describe('skip reindexing', () => {
  const currentVersion = Env.createDefault(REPO_ROOT, getEnvOptions()).packageInfo.version;
  let esServer: TestElasticsearchUtils['es'];
  let root: Root;

  afterEach(async () => {
    await root?.shutdown();
    await esServer?.stop();
    await delay(10);
  });

  it('when migrating to a new version, but mappings remain the same', async () => {
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

    expect(logs).toMatch('INIT -> PREPARE_COMPATIBLE_MIGRATION');
    expect(logs).toMatch('PREPARE_COMPATIBLE_MIGRATION -> OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT');
    expect(logs).toMatch('CHECK_TARGET_MAPPINGS -> CHECK_VERSION_INDEX_READY_ACTIONS');
    expect(logs).toMatch('CHECK_VERSION_INDEX_READY_ACTIONS -> DONE');

    expect(logs).not.toMatch('CREATE_NEW_TARGET');
    expect(logs).not.toMatch('CHECK_TARGET_MAPPINGS -> UPDATE_TARGET_MAPPINGS');

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
    expect(logs).toMatch('INIT -> OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT');
    expect(logs).not.toMatch('INIT -> PREPARE_COMPATIBLE_MIGRATION');
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
