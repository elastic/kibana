/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WebDriver } from 'selenium-webdriver';
import { NoSuchAlertError, UnexpectedAlertOpenError } from 'selenium-webdriver/lib/error';
import type { ToolingLog } from '@kbn/tooling-log';

const UNEXPECTED_BEFOREUNLOAD_DIALOG = 'Unexpected dialog type beforeunload';

/**
 * Accepts an open browser dialog, if any. ChromeDriver 148+ rejects every window command
 * with `Unexpected dialog type beforeunload` while a `beforeunload` dialog is open (it
 * compares the CDP type `"beforeunload"` against the spec name `"beforeUnload"`), and
 * `unhandledPromptBehavior: 'accept'` no longer covers it. Alert commands skip that check,
 * so this is the one way to recover the session (#271881, #273688).
 */
export async function dismissOpenDialog(driver: WebDriver, log: ToolingLog): Promise<void> {
  try {
    await driver.switchTo().alert().accept();
    log.warning('[webdriver] accepted an open browser dialog left behind by a previous spec');
  } catch (error) {
    if (!(error instanceof NoSuchAlertError)) {
      log.warning(`[webdriver] failed to accept an open browser dialog: ${error.message}`);
    }
  }
}

/**
 * Matches both errors a leaked `beforeunload` dialog produces: `unexpected alert open` on
 * the first command, then `Unexpected dialog type beforeunload` on every command after it.
 */
export function isBlockedByOpenDialogError(error: unknown): boolean {
  return (
    error instanceof UnexpectedAlertOpenError ||
    (error instanceof Error && error.message.includes(UNEXPECTED_BEFOREUNLOAD_DIALOG))
  );
}
