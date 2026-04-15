/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import type { ToolingLog } from '@kbn/tooling-log';
import { execPromise } from '../playwright/utils';
import { runValidatePlaywrightConfigs } from './validate_playwright_configs';

jest.mock('fs', () => {
  const actualFs = jest.requireActual('fs');
  return {
    ...actualFs,
    existsSync: jest.fn(),
    readFileSync: jest.fn(),
  };
});

jest.mock('../playwright/utils', () => ({
  execPromise: jest.fn(),
}));

jest.mock('@kbn/scout-info', () => ({
  SCOUT_PLAYWRIGHT_CONFIGS_PATH: '/mock/scout_playwright_configs.json',
}));

jest.mock('@kbn/repo-info', () => ({
  REPO_ROOT: '/mock/repo',
}));

describe('runValidatePlaywrightConfigs', () => {
  let log: jest.Mocked<ToolingLog>;
  const execPromiseMock = execPromise as jest.Mock;
  const existsSyncMock = fs.existsSync as jest.Mock;
  const readFileSyncMock = fs.readFileSync as jest.Mock;

  const modulesWithTests = [
    {
      name: 'pluginA',
      group: 'groupA',
      type: 'plugin',
      configs: [
        {
          path: 'x-pack/plugins/pluginA/test/scout/ui/playwright.config.ts',
          hasTests: true,
          tags: ['@local-stateful-classic'],
          serverRunFlags: ['--arch stateful --domain classic'],
          usesParallelWorkers: false,
        },
      ],
    },
    {
      name: 'pluginB',
      group: 'groupB',
      type: 'plugin',
      configs: [
        {
          path: 'x-pack/plugins/pluginB/test/scout/api/playwright.config.ts',
          hasTests: true,
          tags: ['@local-stateful-classic'],
          serverRunFlags: ['--arch stateful --domain classic'],
          usesParallelWorkers: false,
        },
      ],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    log = {
      info: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
    } as unknown as jest.Mocked<ToolingLog>;

    existsSyncMock.mockReturnValue(true);
    readFileSyncMock.mockReturnValue(JSON.stringify(modulesWithTests));
  });

  it('succeeds when all configs have tests', async () => {
    execPromiseMock.mockResolvedValue({
      stdout: 'Listing tests:\nTotal: 3 tests in 2 files\n',
      stderr: '',
    });

    await runValidatePlaywrightConfigs(5, log);

    expect(execPromiseMock).toHaveBeenCalledTimes(2);
    expect(log.info).toHaveBeenCalledWith('All 2 Playwright config(s) have tests');
  });

  it('throws when a config reports no tests', async () => {
    execPromiseMock
      .mockResolvedValueOnce({ stdout: 'Total: 3 tests in 2 files\n', stderr: '' })
      .mockRejectedValueOnce(new Error('No tests found'));

    await expect(runValidatePlaywrightConfigs(5, log)).rejects.toThrow(
      /The following Playwright config\(s\) reported 0 test files/
    );
  });

  it('includes the config path in the error message', async () => {
    execPromiseMock.mockRejectedValue(new Error('No tests found'));

    await expect(runValidatePlaywrightConfigs(5, log)).rejects.toThrow(
      /pluginA.*playwright\.config\.ts/
    );
  });

  it('throws when discovery JSON does not exist', async () => {
    existsSyncMock.mockReturnValue(false);

    await expect(runValidatePlaywrightConfigs(5, log)).rejects.toThrow(
      /Scout discovery JSON not found/
    );
  });

  it('logs info and returns when there are no configs', async () => {
    readFileSyncMock.mockReturnValue('[]');

    await runValidatePlaywrightConfigs(5, log);

    expect(execPromiseMock).not.toHaveBeenCalled();
    expect(log.info).toHaveBeenCalledWith('No Playwright configs to validate');
  });

  it('deduplicates config paths across modules', async () => {
    const modulesWithDuplicates = [
      {
        name: 'pluginA',
        group: 'groupA',
        type: 'plugin',
        configs: [
          {
            path: 'shared/config/playwright.config.ts',
            hasTests: true,
            tags: [],
            serverRunFlags: [],
            usesParallelWorkers: false,
          },
        ],
      },
      {
        name: 'pluginA-split',
        group: 'groupA',
        type: 'plugin',
        configs: [
          {
            path: 'shared/config/playwright.config.ts',
            hasTests: true,
            tags: [],
            serverRunFlags: [],
            usesParallelWorkers: false,
          },
        ],
      },
    ];

    readFileSyncMock.mockReturnValue(JSON.stringify(modulesWithDuplicates));
    execPromiseMock.mockResolvedValue({ stdout: 'Total: 1 test in 1 file\n', stderr: '' });

    await runValidatePlaywrightConfigs(5, log);

    expect(execPromiseMock).toHaveBeenCalledTimes(1);
  });

  it('reports errors separately from no-tests failures', async () => {
    execPromiseMock
      .mockResolvedValueOnce({ stdout: 'Total: 1 test\n', stderr: '' })
      .mockRejectedValueOnce(new Error('Some unexpected crash'));

    await runValidatePlaywrightConfigs(5, log);

    expect(log.error).toHaveBeenCalledWith(expect.stringContaining('Error validating'));
  });
});
