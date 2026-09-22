/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ToolingLog } from '@kbn/tooling-log';
import { CiStatsReporter } from '@kbn/ci-stats-reporter';
import { DEFAULT_THEME_TAGS } from '@kbn/core-ui-settings-common';

import { reportOptimizerTimings } from './report_optimizer_timings';

jest.mock('@kbn/ci-stats-reporter');

describe('reportOptimizerTimings', () => {
  const timings = jest.fn();
  const log = new ToolingLog();

  beforeEach(() => {
    timings.mockReset();
    jest
      .mocked(CiStatsReporter.fromEnv)
      .mockReturnValue({ isEnabled: () => true, timings } as unknown as CiStatsReporter);
  });

  const meta = () => timings.mock.calls[0][0].timings[0].meta;

  it('reports the discovered bundle count and the defaulted theme tags when options omit them', async () => {
    await reportOptimizerTimings(
      log,
      { repoRoot: '/repo', dist: true },
      { success: true, bundleCount: 312 },
      1234
    );

    expect(timings.mock.calls[0][0].timings[0]).toMatchObject({
      group: 'scripts/build_kibana_platform_plugins',
      id: 'total',
      ms: 1234,
    });
    expect(meta()).toMatchObject({
      optimizerSuccess: true,
      optimizerBundleCount: 312,
      optimizerProduction: true,
      optimizerBundleThemeTagsCount: DEFAULT_THEME_TAGS.length,
    });
  });

  it('reports the explicit theme tag count when provided', async () => {
    await reportOptimizerTimings(
      log,
      { repoRoot: '/repo', themeTags: ['borealislight'] },
      { success: false },
      1
    );

    expect(meta()).toMatchObject({
      optimizerSuccess: false,
      optimizerBundleCount: 0,
      optimizerBundleThemeTagsCount: 1,
    });
  });

  it('does nothing when ci-stats is not configured', async () => {
    jest
      .mocked(CiStatsReporter.fromEnv)
      .mockReturnValue({ isEnabled: () => false, timings } as unknown as CiStatsReporter);

    await reportOptimizerTimings(log, { repoRoot: '/repo' }, { success: true }, 1);
    expect(timings).not.toHaveBeenCalled();
  });
});
