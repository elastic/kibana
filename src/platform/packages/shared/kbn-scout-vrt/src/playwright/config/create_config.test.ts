/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PlaywrightTestConfig } from '@playwright/test';
import { createPlaywrightConfig as createScoutPlaywrightConfig } from '@kbn/scout';
import { generateTestRunId } from '@kbn/scout-reporting';
import { createPlaywrightConfig } from './create_config';
import { getVisualRegressionPlaywrightArtifactsDir } from '../runtime/paths';

jest.mock('@kbn/scout', () => ({
  ...jest.requireActual('@kbn/scout'),
  createPlaywrightConfig: jest.fn(),
}));

jest.mock('@kbn/scout-reporting', () => ({
  ...jest.requireActual('@kbn/scout-reporting'),
  generateTestRunId: jest.fn(),
}));

describe('createPlaywrightConfig', () => {
  const mockedScoutConfig = createScoutPlaywrightConfig as jest.MockedFunction<
    typeof createScoutPlaywrightConfig
  >;
  const mockedGenerateRunId = generateTestRunId as jest.MockedFunction<typeof generateTestRunId>;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.SCOUT_VISUAL_REGRESSION_ENABLED;
    delete process.env.TEST_RUN_ID;

    mockedScoutConfig.mockReturnValue({
      reporter: [['json', { outputFile: './.scout/reports/test-results.json' }]],
      outputDir: './.scout/test-artifacts',
    } as unknown as PlaywrightTestConfig);
  });

  it('returns the base Scout config when visual regression is disabled', () => {
    const config = createPlaywrightConfig({ testDir: './tests' });

    expect(config.outputDir).toBe('./.scout/test-artifacts');
    expect(config.reporter).toEqual([
      ['json', { outputFile: './.scout/reports/test-results.json' }],
    ]);
  });

  it('adds the visual regression reporter and output directory when enabled', () => {
    process.env.SCOUT_VISUAL_REGRESSION_ENABLED = 'true';
    mockedGenerateRunId.mockReturnValue('vrt-run-id');

    const config = createPlaywrightConfig({ testDir: './tests' });

    expect(config.outputDir).toBe(getVisualRegressionPlaywrightArtifactsDir('vrt-run-id'));
    expect(config.reporter).toEqual([
      ['json', { outputFile: './.scout/reports/test-results.json' }],
      ['@kbn/scout-vrt/src/playwright/reporting/playwright_reporter', { runId: 'vrt-run-id' }],
    ]);
    expect(process.env.TEST_RUN_ID).toBe('vrt-run-id');
  });
});
