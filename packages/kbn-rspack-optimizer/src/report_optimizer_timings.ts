/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CiStatsReporter } from '@kbn/ci-stats-reporter';
import type { ToolingLog } from '@kbn/tooling-log';
import { DEFAULT_THEME_TAGS } from '@kbn/core-ui-settings-common';

import type { BuildOptions, BuildResult } from './run_build';

/**
 * Ships the total optimizer run time (plus run metadata) to ci-stats; no-op when
 * ci-stats is not configured for this environment.
 */
export async function reportOptimizerTimings(
  log: ToolingLog,
  options: BuildOptions,
  result: BuildResult,
  ms: number
): Promise<void> {
  const reporter = CiStatsReporter.fromEnv(log);
  if (!reporter.isEnabled()) {
    return;
  }

  await reporter.timings({
    timings: [
      {
        group: 'scripts/build_kibana_platform_plugins',
        id: 'total',
        ms,
        meta: {
          optimizerSuccess: result.success,
          optimizerBundleCount: result.bundleCount ?? 0,
          optimizerWatch: options.watch ?? false,
          optimizerProduction: options.dist ?? false,
          optimizerCache: options.cache ?? true,
          optimizerBundleThemeTagsCount: (options.themeTags ?? DEFAULT_THEME_TAGS).length,
        },
      },
    ],
  });
}
