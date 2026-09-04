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
 * ChromeDriver 148+ rejects every window command (navigate, getRect, executeScript, CDP
 * passthrough) with `InvalidArgumentError: Unexpected dialog type beforeunload` while a
 * `beforeunload` dialog is open, even with `unhandledPromptBehavior: 'accept'`: its prompt
 * handler compares the CDP type `"beforeunload"` against the spec name `"beforeUnload"` and
 * never matches (see #271881, #273688). Alert commands skip that check, so accepting the
 * dialog explicitly is the one way to unwedge the session.
 *
 * Resolves to `true` when a dialog was accepted, `false` when there was none. Any other
 * failure is logged and swallowed so the caller's own next command reports the real state.
 */
export async function dismissOpenDialog(driver: WebDriver, log: ToolingLog): Promise<boolean> {
  try {
    await driver.switchTo().alert().accept();
    log.warning('[webdriver] accepted an open browser dialog left behind by a previous spec');
    return true;
  } catch (error) {
    if (error instanceof NoSuchAlertError) {
      return false;
    }
    log.warning(`[webdriver] failed to accept an open browser dialog: ${error.message}`);
    return false;
  }
}

/**
 * True for the two errors ChromeDriver returns when a leaked `beforeunload` dialog blocks
 * a command: the spec-compliant `unexpected alert open` on the first hit, then the broken
 * `Unexpected dialog type beforeunload` on every command after it.
 */
export function isBlockedByOpenDialogError(error: unknown): boolean {
  return (
    error instanceof UnexpectedAlertOpenError ||
    (error instanceof Error && error.message.includes(UNEXPECTED_BEFOREUNLOAD_DIALOG))
  );
}
