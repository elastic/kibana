/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import fs from 'fs/promises';
import { SemVer } from 'semver';
import JSON5 from 'json5';
import { Env } from '@kbn/config';
import { REPO_ROOT } from '@kbn/utils';
import { getEnvOptions } from '@kbn/config-mocks';
import { Root } from '@kbn/core-root-server-internal';
import { LogRecord } from '@kbn/logging';
import {
  createRootWithCorePlugins,
  createTestServers,
  type TestElasticsearchUtils,
} from '@kbn/core-test-helpers-kbn-server';

const logFilePath = Path.join(__dirname, 'check_target_mappings.log');

const delay = (seconds: number) => new Promise((resolve) => setTimeout(resolve, seconds * 1000));

async function removeLogFile() {
  // ignore errors if it doesn't exist
  await fs.unlink(logFilePath).catch(() => void 0);
}

async function parseLogFile() {
  const logFileContent = await fs.readFile(logFilePath, 'utf-8');

  return logFileContent
    .split('\n')
    .filter(Boolean)
    .map((str) => JSON5.parse(str)) as LogRecord[];
}

function logIncludes(logs: LogRecord[], message: string): boolean {
  return Boolean(logs?.find((rec) => rec.message.includes(message)));
}

describe('migration v2 - CHECK_TARGET_MAPPINGS', () => {
  let esServer: TestElasticsearchUtils;
  let root: Root;
  let logs: LogRecord[];

  beforeEach(async () => await removeLogFile());

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
    logs = await parseLogFile();
    expect(logIncludes(logs, 'CREATE_NEW_TARGET')).toEqual(true);
    expect(logIncludes(logs, 'CHECK_TARGET_MAPPINGS')).toEqual(false);
  });

  describe('when the indices are aligned with the stack version', () => {
    it('skips UPDATE_TARGET_MAPPINGS if there are no changes in the mappings', async () => {
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
      await removeLogFile();

      root = createRoot();
      await root.preboot();
      await root.setup();
      await root.start();

      // Check for migration steps present in the logs
      logs = await parseLogFile();
      expect(logIncludes(logs, 'CREATE_NEW_TARGET')).toEqual(false);
      expect(
        logIncludes(logs, 'CHECK_TARGET_MAPPINGS -> CHECK_VERSION_INDEX_READY_ACTIONS')
      ).toEqual(true);
      expect(logIncludes(logs, 'UPDATE_TARGET_MAPPINGS')).toEqual(false);
      expect(logIncludes(logs, 'UPDATE_TARGET_MAPPINGS_WAIT_FOR_TASK')).toEqual(false);
      expect(logIncludes(logs, 'UPDATE_TARGET_MAPPINGS_META')).toEqual(false);
    });
  });

  describe('when upgrading to a newer stack version', () => {
    const currentVersion = Env.createDefault(REPO_ROOT, getEnvOptions()).packageInfo.version;

    it('runs UPDATE_TARGET_MAPPINGS when mappings have changed', async () => {
      const { startES } = createTestServers({
        adjustTimeout: (t: number) => jest.setTimeout(t),
        settings: {
          es: {
            license: 'basic',
            dataArchive: Path.join(__dirname, 'archives', '8.4.0_with_sample_data_logs.zip'),
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
      logs = await parseLogFile();
      expect(logIncludes(logs, 'CREATE_NEW_TARGET')).toEqual(false);
      expect(logIncludes(logs, 'CHECK_TARGET_MAPPINGS -> UPDATE_TARGET_MAPPINGS')).toEqual(true);
      expect(
        logIncludes(logs, 'UPDATE_TARGET_MAPPINGS -> UPDATE_TARGET_MAPPINGS_WAIT_FOR_TASK')
      ).toEqual(true);
      expect(
        logIncludes(logs, 'UPDATE_TARGET_MAPPINGS_WAIT_FOR_TASK -> UPDATE_TARGET_MAPPINGS_META')
      ).toEqual(true);
      expect(
        logIncludes(logs, 'UPDATE_TARGET_MAPPINGS_META -> CHECK_VERSION_INDEX_READY_ACTIONS')
      ).toEqual(true);
      expect(
        logIncludes(logs, 'CHECK_VERSION_INDEX_READY_ACTIONS -> MARK_VERSION_INDEX_READY')
      ).toEqual(true);
      expect(logIncludes(logs, 'MARK_VERSION_INDEX_READY -> DONE')).toEqual(true);
      expect(logIncludes(logs, 'Migration completed')).toEqual(true);
    });

    it('runs UPDATE_TARGET_MAPPINGS even if the mappings have NOT changed', async () => {
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
      await removeLogFile();

      const nextMinor = new SemVer(currentVersion).inc('patch').format();
      root = createRoot(undefined, nextMinor);
      await root.preboot();
      await root.setup();
      await root.start();

      // Check for migration steps present in the logs
      logs = await parseLogFile();
      expect(logIncludes(logs, 'CREATE_NEW_TARGET')).toEqual(false);
      expect(logIncludes(logs, 'CHECK_TARGET_MAPPINGS -> UPDATE_TARGET_MAPPINGS')).toEqual(true);
      expect(
        logIncludes(logs, 'UPDATE_TARGET_MAPPINGS -> UPDATE_TARGET_MAPPINGS_WAIT_FOR_TASK')
      ).toEqual(true);
      expect(
        logIncludes(logs, 'UPDATE_TARGET_MAPPINGS_WAIT_FOR_TASK -> UPDATE_TARGET_MAPPINGS_META')
      ).toEqual(true);
      expect(
        logIncludes(logs, 'UPDATE_TARGET_MAPPINGS_META -> CHECK_VERSION_INDEX_READY_ACTIONS')
      ).toEqual(true);
      expect(
        logIncludes(logs, 'CHECK_VERSION_INDEX_READY_ACTIONS -> MARK_VERSION_INDEX_READY')
      ).toEqual(true);
      expect(logIncludes(logs, 'MARK_VERSION_INDEX_READY -> DONE')).toEqual(true);
      expect(logIncludes(logs, 'Migration completed')).toEqual(true);
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
