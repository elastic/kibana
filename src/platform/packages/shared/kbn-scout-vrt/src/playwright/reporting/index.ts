/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReporterDescription } from 'playwright/test';
import type { ScoutVisualRegressionReporterOptions } from './visual_regression_reporter';

export { createVisualRegressionManifest } from './manifest';
export type {
  VisualRegressionManifest,
  VisualRegressionManifestResult,
  VisualRegressionManifestSummary,
  VisualRegressionRunManifest,
  VisualRegressionRunManifestPackage,
  VisualRegressionRunMode,
  VisualRegressionRunStatus,
  VisualRegressionTarget,
} from './manifest';
export { VISUAL_REGRESSION_SCHEMA_VERSION } from './manifest';
export { ScoutVisualRegressionReporter } from './visual_regression_reporter';

export const scoutVisualRegressionReporter = (
  options: ScoutVisualRegressionReporterOptions
): ReporterDescription => {
  return ['@kbn/scout-vrt/src/playwright/reporting/playwright_reporter', options];
};
