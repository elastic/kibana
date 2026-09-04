/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isFailError } from '@kbn/dev-cli-errors';
import type { ToolingLog } from '@kbn/tooling-log';
import { generateScoutConfigManifest, updateScoutConfigManifests } from './manifests';
import { playwrightCLI } from '../playwright/cli_wrapper';

jest.mock('../playwright/cli_wrapper', () => ({
  playwrightCLI: { test: jest.fn() },
}));

jest.mock('@kbn/scout-reporting', () => ({
  testConfigs: { all: [], log: null },
  testConfigManifests: { findPaths: jest.fn().mockReturnValue([]) },
  getGitSHA1ForPath: jest.fn().mockResolvedValue('abc123'),
  testableModules: { allIncludingConfigs: [] },
}));

describe('generateScoutConfigManifest', () => {
  const playwrightTestMock = playwrightCLI.test as jest.Mock;
  const configPath = 'x-pack/some/test/scout/api/playwright.config.ts';

  beforeEach(() => {
    playwrightTestMock.mockReset();
  });

  it(`returns the Playwright result when '--list' exits with code 0`, async () => {
    playwrightTestMock.mockResolvedValueOnce({ exitCode: 0 });

    await expect(generateScoutConfigManifest(configPath)).resolves.toEqual({ exitCode: 0 });

    expect(playwrightTestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        config: configPath,
        list: true,
        passWithNoTests: true,
        project: 'local',
      }),
      {},
      undefined
    );
  });

  it(`throws a FailError when '--list' exits non-zero (real discovery failure)`, async () => {
    playwrightTestMock.mockResolvedValueOnce({ exitCode: 1 });

    const error = await generateScoutConfigManifest(configPath).catch((e) => e);

    expect(isFailError(error)).toBe(true);
    expect(error.message).toMatch(
      /Failed to discover tests for Scout config at '.*playwright\.config\.ts': playwright --list exited with code 1/
    );
  });
});

describe('updateScoutConfigManifests', () => {
  const playwrightTestMock = playwrightCLI.test as jest.Mock;
  const mockScoutReporting = jest.requireMock('@kbn/scout-reporting');

  const configPath = 'x-pack/some/test/scout/api/playwright.config.ts';
  const mockConfig = {
    path: configPath,
    manifest: { path: `${configPath}/.meta/api/standard.json`, exists: false, sha1: '', tests: [] },
  };

  let log: ToolingLog;

  beforeEach(() => {
    playwrightTestMock.mockReset();
    mockScoutReporting.testConfigs.all = [mockConfig];
    mockScoutReporting.getGitSHA1ForPath.mockResolvedValue('abc123');
    log = {
      debug: jest.fn(),
      info: jest.fn(),
      warning: jest.fn(),
      error: jest.fn(),
      write: jest.fn(),
    } as unknown as ToolingLog;
  });

  it('logs the Error message when generateScoutConfigManifest rejects with an Error', async () => {
    playwrightTestMock.mockResolvedValueOnce({ exitCode: 1 }).mockResolvedValue({ exitCode: 0 });

    await updateScoutConfigManifests(false, false, false, 1, log);

    expect(log.error).toHaveBeenCalledWith(
      expect.stringContaining(
        `Failed to generate manifest for test config at '${configPath}': Failed to discover tests`
      )
    );
  });

  it('logs the string representation when generateScoutConfigManifest rejects with a non-Error', async () => {
    playwrightTestMock
      .mockRejectedValueOnce('unexpected string rejection')
      .mockResolvedValue({ exitCode: 0 });

    await updateScoutConfigManifests(false, false, false, 1, log);

    expect(log.error).toHaveBeenCalledWith(
      expect.stringContaining(
        `Failed to generate manifest for test config at '${configPath}': unexpected string rejection`
      )
    );
  });
});
