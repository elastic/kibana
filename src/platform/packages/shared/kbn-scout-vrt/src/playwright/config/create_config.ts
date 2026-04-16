/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PlaywrightTestConfig, ReporterDescription } from '@playwright/test';
import type { ScoutPlaywrightOptions, ScoutTestOptions } from '@kbn/scout';
import { createPlaywrightConfig as createScoutPlaywrightConfig } from '@kbn/scout';
import { generateTestRunId } from '@kbn/scout-reporting';
import { scoutVisualRegressionReporter } from '../reporting';
import { ensureVisualRegressionRunId, isVisualRegressionEnabled } from '../runtime/environment';
import { getVisualRegressionPlaywrightArtifactsDir } from '../runtime/paths';

export function createPlaywrightConfig(
  options: ScoutPlaywrightOptions
): PlaywrightTestConfig<ScoutTestOptions> {
  const baseConfig = createScoutPlaywrightConfig(options);

  if (!isVisualRegressionEnabled()) {
    return baseConfig;
  }

  const runId = ensureVisualRegressionRunId(generateTestRunId);
  const normalizeReporters = (): ReporterDescription[] => {
    const { reporter } = baseConfig;

    if (!reporter) {
      return [];
    }

    if (typeof reporter === 'string') {
      return [[reporter]];
    }

    if (!Array.isArray(reporter)) {
      return [];
    }

    // Distinguish a single reporter tuple ['html', { open: 'never' }]
    // from an array of reporters [['html', {...}], ['json', {...}]]
    if (reporter.length > 0 && typeof reporter[0] === 'string') {
      return [reporter as unknown as ReporterDescription];
    }

    return reporter as unknown as ReporterDescription[];
  };

  const reporters = normalizeReporters();

  return {
    ...baseConfig,
    outputDir: getVisualRegressionPlaywrightArtifactsDir(runId),
    reporter: [...reporters, scoutVisualRegressionReporter({ runId })],
  };
}
