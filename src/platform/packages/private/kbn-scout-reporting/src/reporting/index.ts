/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReporterDescription } from 'playwright/test';
import { SCOUT_REPORTER_ENABLED } from '@kbn/scout-info';
import { ScoutPlaywrightReporterOptions } from './playwright/scout_playwright_reporter';

export * from './report';

// Playwright event-based reporting
export const scoutPlaywrightReporter = (
  options?: ScoutPlaywrightReporterOptions
): ReporterDescription => {
  return SCOUT_REPORTER_ENABLED
    ? ['@kbn/scout-reporting/src/reporting/playwright/events', options]
    : ['null'];
};

// Playwright failed test reporting
export const scoutFailedTestsReporter = (
  options?: ScoutPlaywrightReporterOptions
): ReporterDescription => {
  return SCOUT_REPORTER_ENABLED
    ? ['@kbn/scout-reporting/src/reporting/playwright/failed_test', options]
    : ['null'];
};
