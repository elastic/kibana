/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

jest.mock('execa');

import { ScoutTestTarget } from '@kbn/scout-info';
import type { PinnedConfig } from './pins';
import { getRunningServers, isServingConfig } from './servers';

const execa = jest.requireMock('execa');

const givenProcesses = (lines: string[]) => execa.mockResolvedValue({ stdout: lines.join('\n') });

const config = (configSet: string): PinnedConfig => ({
  path: 'src/platform/plugins/shared/dashboard/test/scout/ui/playwright.config.ts',
  module: 'dashboard',
  file: 'test/scout/ui/playwright.config.ts',
  configSet,
  category: 'ui',
  targets: ['local-stateful-classic'],
  hasManifest: true,
});

describe('getRunningServers', () => {
  beforeEach(() => jest.clearAllMocks());

  it('reads the target a start-server was started for', async () => {
    givenProcesses(['  1234 node scripts/scout start-server --arch stateful --domain classic']);

    await expect(getRunningServers()).resolves.toEqual([
      { pid: 1234, arch: 'stateful', domain: 'classic', configSet: 'default' },
    ]);
  });

  it('reads flags written as --flag=value', async () => {
    givenProcesses([
      '  1234 node scripts/scout start-server --arch=serverless --domain=search --serverConfigSet=fips',
    ]);

    await expect(getRunningServers()).resolves.toEqual([
      { pid: 1234, arch: 'serverless', domain: 'search', configSet: 'fips' },
    ]);
  });

  it('finds node by an absolute path and ignores unrelated processes', async () => {
    givenProcesses([
      '  1 /sbin/launchd',
      '  200 node scripts/scout run-tests --arch stateful --domain classic',
      '  300 /Users/someone/.nvm/versions/node/v20.0.0/bin/node scripts/scout start-server --arch stateful --domain classic',
      '  400 nodemon scripts/scout start-server --arch stateful --domain classic',
      '',
    ]);

    await expect(getRunningServers()).resolves.toEqual([
      { pid: 300, arch: 'stateful', domain: 'classic', configSet: 'default' },
    ]);
  });
});

describe('isServingConfig', () => {
  const target = ScoutTestTarget.fromTag('local-stateful-classic');
  const server = { pid: 1, arch: 'stateful', domain: 'classic', configSet: 'default' };

  it('matches a server started for the same target and server set', () => {
    expect(isServingConfig(server, config('default'), target)).toBe(true);
  });

  it('rejects a server started for another architecture', () => {
    expect(isServingConfig({ ...server, arch: 'serverless' }, config('default'), target)).toBe(
      false
    );
  });

  it('rejects a server started for another domain', () => {
    expect(isServingConfig({ ...server, domain: 'search' }, config('default'), target)).toBe(false);
  });

  it('rejects a server started with another server config set', () => {
    // reusing it would run the tests against servers configured for something else
    expect(isServingConfig(server, config('fips'), target)).toBe(false);
  });

  it('rejects a server whose flags ps could not report', () => {
    expect(isServingConfig({ pid: 1, configSet: 'default' }, config('default'), target)).toBe(
      false
    );
  });
});
