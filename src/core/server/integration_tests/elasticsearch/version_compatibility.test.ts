/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  createTestServers,
  type TestElasticsearchUtils,
  type TestKibanaUtils,
} from '@kbn/core-test-helpers-kbn-server';
import { esTestConfig } from '@kbn/test';
import { firstValueFrom, Subject } from 'rxjs';
import { CliArgs } from '@kbn/config';
import Semver from 'semver';
import { unsafeConsole } from '@kbn/security-hardening';

function nextMinor() {
  return Semver.inc(esTestConfig.getVersion(), 'minor') || '10.0.0';
}

function previousMinor() {
  const [major, minor] = esTestConfig
    .getVersion()
    .split('.')
    .map((s) => parseInt(s, 10));
  // We should be fine for now. When we jump to the next major, we'll need to handle that.
  return `${major}.${minor - 1}.0`;
}

describe('Version Compatibility', () => {
  let esServer: TestElasticsearchUtils | undefined;
  let kibanaServer: TestKibanaUtils | undefined;
  let abortController: AbortController | undefined;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(unsafeConsole, 'log');
  });

  afterEach(async () => {
    consoleSpy.mockRestore();
    if (kibanaServer) {
      await kibanaServer.stop();
    } else {
      abortController?.abort();
    }
    if (esServer) {
      await esServer.stop();
    }
    kibanaServer = undefined;
    abortController = undefined;
    esServer = undefined;
  });

  const startServers = async ({
    cliArgs,
    customKibanaVersion,
    ignoreVersionMismatch,
  }: {
    cliArgs?: Partial<CliArgs>;
    customKibanaVersion?: string;
    ignoreVersionMismatch?: boolean;
  } = {}) => {
    const { startES, startKibana } = createTestServers({
      adjustTimeout: jest.setTimeout,
      settings: {
        kbn: {
          cliArgs,
          customKibanaVersion,
          elasticsearch: {
            ignoreVersionMismatch,
          },
        },
      },
    });

    esServer = await startES();
    abortController = new AbortController();
    kibanaServer = await startKibana(abortController.signal);
  };

  it('should start when versions match', async () => {
    await expect(startServers({})).resolves.toBeUndefined();
  });

  // skipping this as it fails when a migration is added
  it.skip('should start when ES is next minor', async () => {
    await expect(startServers({ customKibanaVersion: previousMinor() })).resolves.toBeUndefined();
  });

  // FLAKY: https://github.com/elastic/kibana/issues/171289
  it.skip('should flag the incompatibility on version mismatch (ES is previous minor)', async () => {
    const found$ = new Subject<void>();
    consoleSpy.mockImplementation((str) => {
      if (str.includes('is incompatible')) {
        found$.next();
      }
    });
    await Promise.race([
      firstValueFrom(found$),
      startServers({ customKibanaVersion: nextMinor() }).then(() => {
        throw new Error(
          'Kibana completed the bootstrap without finding the incompatibility message'
        );
      }),
      new Promise((resolve, reject) =>
        setTimeout(() => reject(new Error('Test timedout')), 5 * 60 * 1000)
      ),
    ]).finally(() => found$.complete());
  });

  it('should ignore the version mismatch when option is set', async () => {
    await expect(
      startServers({
        customKibanaVersion: nextMinor(),
        cliArgs: { dev: true },
        ignoreVersionMismatch: true,
      })
    ).resolves.toBeUndefined();
  });

  it('should not allow the option when not in dev mode', async () => {
    await expect(
      startServers({ customKibanaVersion: nextMinor(), ignoreVersionMismatch: true })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"[config validation of [elasticsearch].ignoreVersionMismatch]: \\"ignoreVersionMismatch\\" can only be set to true in development mode"`
    );
  });

  it('should ignore version mismatch when running on serverless mode and complete startup', async () => {
    await expect(
      startServers({ customKibanaVersion: nextMinor(), cliArgs: { serverless: true } })
    ).resolves.toBeUndefined();
  });
});
