/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BROWSER_CONSOLE_ERRORS_ATTACHMENT } from '@kbn/scout-info';
import type { ConsoleMessage, Page, TestInfo } from '@playwright/test';

/**
 * Starts collecting browser console errors on the given page.
 * Returns a function that stops collecting and returns all captured error messages.
 */
export const collectBrowserConsoleErrors = (page: Page): (() => string[]) => {
  const errors: string[] = [];
  const onConsole = (msg: ConsoleMessage) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  };
  page.on('console', onConsole);

  return () => {
    page.off('console', onConsole);
    return errors;
  };
};

/**
 * Attaches collected browser console errors to the Playwright test result.
 * No-op if the errors array is empty. Best-effort: attachment failure does not
 * propagate so it cannot mask the original test failure.
 */
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
