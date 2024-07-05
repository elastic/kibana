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
import { REPO_ROOT } from '@kbn/repo-info';
import { getEnvOptions } from '@kbn/config-mocks';
import { Root } from '@kbn/core-root-server-internal';
import {
  createRootWithCorePlugins,
  createTestServers,
  type TestElasticsearchUtils,
} from '@kbn/core-test-helpers-kbn-server';
import { delay } from '../test_utils';

const logFilePath = Path.join(__dirname, 'check_target_mappings.log');

describe('migration v2 - CHECK_TARGET_MAPPINGS', () => {
  let esServer: TestElasticsearchUtils;
  let root: Root;
  let logs: string;

  beforeEach(async () => {
    await fs.unlink(logFilePath).catch(() => {});
  });

  afterEach(async () => {
    await root?.shutdown();
    await esServer?.stop();
    await delay(10);
  });

  it('is not run for new installations', async () => {
    const { startES } = createTestServers({
      adjustTimeout: (t: number) => jest.setTimeout(t),
      settings: {
        es: {
          license: 'basic',
        },
      },
    });

    root = createRoot();
    esServer = await startES();
    await root.preboot();
    await root.setup();
    await root.start();

    // Check for migration steps present in the logs
    logs = await fs.readFile(logFilePath, 'utf-8');

    expect(logs).toMatch('CREATE_NEW_TARGET');
    expect(logs).not.toMatch('CHECK_TARGET_MAPPINGS');
  });

  describe('when the indices are aligned with the stack version', () => {
    it('skips UPDATE_TARGET_MAPPINGS_PROPERTIES if there are no changes in the mappings', async () => {
      const { startES } = createTestServers({
        adjustTimeout: (t: number) => jest.setTimeout(t),
        settings: {
          es: {
            license: 'basic',
          },
        },
      });

      esServer = await startES();

      // start Kibana a first time to create the system indices
      root = createRoot();
      await root.preboot();
      await root.setup();
      await root.start();

      // stop Kibana and remove logs
      await root.shutdown();
      await delay(10);
      await fs.unlink(logFilePath).catch(() => {});

      root = createRoot();
      await root.preboot();
      await root.setup();
      await root.start();

      // Check for migration steps present in the logs
      logs = await fs.readFile(logFilePath, 'utf-8');
      expect(logs).not.toMatch('CREATE_NEW_TARGET');
      expect(logs).toMatch('CHECK_TARGET_MAPPINGS -> CHECK_VERSION_INDEX_READY_ACTIONS');
      expect(logs).not.toMatch('UPDATE_TARGET_MAPPINGS_PROPERTIES');
      expect(logs).not.toMatch('UPDATE_TARGET_MAPPINGS_PROPERTIES_WAIT_FOR_TASK');
      expect(logs).not.toMatch('UPDATE_TARGET_MAPPINGS_META');
    });
  });

  describe('when upgrading to a newer stack version', () => {
    const currentVersion = Env.createDefault(REPO_ROOT, getEnvOptions()).packageInfo.version;

    it('runs UPDATE_TARGET_MAPPINGS_PROPERTIES when mappings have changed', async () => {
      const { startES } = createTestServers({
        adjustTimeout: (t: number) => jest.setTimeout(t),
        settings: {
          es: {
            license: 'basic',
            dataArchive: Path.join(__dirname, '..', 'archives', '8.4.0_with_sample_data_logs.zip'),
          },
        },
      });

      esServer = await startES();

      // start Kibana a first time to create the system indices
      root = createRoot(currentVersion); // we discard a bunch of SO that have become unknown since 8.4.0
      await root.preboot();
      await root.setup();
      await root.start();

      // Check for migration steps present in the logs
      logs = await fs.readFile(logFilePath, 'utf-8');
      expect(logs).not.toMatch('[.kibana] CREATE_NEW_TARGET');
      expect(logs).toMatch('CHECK_TARGET_MAPPINGS -> UPDATE_TARGET_MAPPINGS_PROPERTIES');
      expect(logs).toMatch(
        'UPDATE_TARGET_MAPPINGS_PROPERTIES -> UPDATE_TARGET_MAPPINGS_PROPERTIES_WAIT_FOR_TASK'
      );
      expect(logs).toMatch(
        'UPDATE_TARGET_MAPPINGS_PROPERTIES_WAIT_FOR_TASK -> UPDATE_TARGET_MAPPINGS_META'
      );
      expect(logs).toMatch('UPDATE_TARGET_MAPPINGS_META -> CHECK_VERSION_INDEX_READY_ACTIONS');
      expect(logs).toMatch('Migration completed');
    });
  });
});

function createRoot(discardUnknownObjects?: string, customKibanaVersion?: string) {
  return createRootWithCorePlugins(
    {
      migrations: {
        discardUnknownObjects,
      },
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
    {
      oss: true,
    },
    customKibanaVersion
  );
}
