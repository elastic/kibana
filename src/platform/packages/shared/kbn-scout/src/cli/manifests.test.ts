/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isFailError } from '@kbn/dev-cli-errors';
import { generateScoutConfigManifest } from './manifests';
import { playwrightCLI } from '../playwright/cli_wrapper';

jest.mock('../playwright/cli_wrapper', () => ({
  playwrightCLI: { test: jest.fn() },
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
