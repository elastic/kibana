/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BROWSER_CONSOLE_ERRORS_ATTACHMENT } from '@kbn/scout-info';
import type { Page, TestInfo } from '@playwright/test';

// Set SCOUT_REPORT_ALL_CONSOLE_LOGS=true to disable filtering and capture every console error.
const filteringEnabled = process.env.SCOUT_REPORT_ALL_CONSOLE_LOGS !== 'true';

// Known non-actionable errors that are expected in Kibana's environment and would
// only add noise to failure reports when no filtering opt-out is set.
const IGNORED_ERROR_PATTERNS = [
  // CSP violations from inline scripts are expected in Kibana's dev/test environment
  'Executing inline script violates the following Content Security Policy directive',
  // Moment Timezone data is not bundled for all timezones in the test environment
  'Moment Timezone',
];

const isIgnored = (message: string) =>
  IGNORED_ERROR_PATTERNS.some((pattern) => message.includes(pattern));

// page fixture has test scope so a new Page instance is created per test — no need to call page.off()
export const collectBrowserConsoleErrors = (page: Page): string[] => {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (filteringEnabled && isIgnored(text)) return;
    errors.push(`[${new Date().toISOString()}] ${text}`);
  });
  return errors;
};

export const attachBrowserConsoleErrors = async (
  testInfo: TestInfo,
  errors: string[]
): Promise<void> => {
  if (errors.length === 0) {
    return;
  }

  try {
    await testInfo.attach(BROWSER_CONSOLE_ERRORS_ATTACHMENT, {
      body: Buffer.from(errors.join('\n')),
      contentType: 'text/plain',
    });
  } catch {
    // best-effort: don't let attachment failure mask the original test failure
  }
};
