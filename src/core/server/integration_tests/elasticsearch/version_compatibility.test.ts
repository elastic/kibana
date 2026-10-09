/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  createTestServers,
  type TestElasticsearchUtils,
  type TestKibanaUtils,
} from '@kbn/core-test-helpers-kbn-server';
import { firstValueFrom, Subject } from 'rxjs';
import type { CliArgs } from '@kbn/config';
import { unsafeConsole } from '@kbn/security-hardening';
import { getFips } from 'crypto';

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
    await kibanaServer?.stop();
    abortController?.abort();
    await esServer?.stop();
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
    /**
     * Kibana version to use, relative to the actual running ES version. Accepts a concrete
     * semver string or one of the special tokens `'nextMinor'` / `'previousMinor'`, which
     * are resolved against the real ES version at startup time. Using tokens is preferred
     * over pre-computing versions from `package.json` (e.g. via `esTestConfig.getVersion()`),
     * because the ES snapshot can be promoted ahead of the Kibana package version, causing a
     * statically computed next/previous minor to accidentally equal the real ES version.
     */
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

  it('should start when ES is next minor', async () => {
    await expect(startServers({ customKibanaVersion: 'previousMinor' })).resolves.toBeUndefined();
  });

  it('should flag the incompatibility on version mismatch (ES is previous minor)', async () => {
    const found$ = new Subject<void>();
    consoleSpy.mockImplementation((str) => {
      if (str.includes('is incompatible')) {
        found$.next();
      }
    });
    await Promise.race([
      firstValueFrom(found$),
      // Use the 'nextMinor' token so the version is always computed from the actual running ES
      // version at startup time. A pre-computed version (e.g. from esTestConfig.getVersion())
      // would break when the ES snapshot is promoted ahead of the Kibana package version,
      // because it would accidentally equal the real ES version and produce no mismatch.
      startServers({ customKibanaVersion: 'nextMinor' }).then(() => {
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
        customKibanaVersion: 'nextMinor',
        cliArgs: { dev: true },
        ignoreVersionMismatch: true,
      })
    ).resolves.toBeUndefined();
  });

  it('should not allow the option when not in dev mode', async () => {
    await expect(
      startServers({ customKibanaVersion: 'nextMinor', ignoreVersionMismatch: true })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"[config validation of [elasticsearch].ignoreVersionMismatch]: \\"ignoreVersionMismatch\\" can only be set to true in development mode"`
    );
  });

  if (getFips() === 0) {
    it('should ignore version mismatch when running on serverless mode and complete startup', async () => {
      await expect(
        startServers({ customKibanaVersion: 'nextMinor', cliArgs: { serverless: true } })
      ).resolves.toBeUndefined();
    });
  } else {
    it('fips is enabled, serverless doesnt like the config overrides', () => {
      expect(getFips()).toBe(1);
    });
  }
});
