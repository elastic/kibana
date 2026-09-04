/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WebDriver } from 'selenium-webdriver';
import {
  InvalidArgumentError,
  NoSuchAlertError,
  UnexpectedAlertOpenError,
} from 'selenium-webdriver/lib/error';
import { ToolingLog } from '@kbn/tooling-log';
import { dismissOpenDialog, isBlockedByOpenDialogError } from './dismiss_open_dialog';

const makeDriver = (accept: jest.Mock) =>
  ({ switchTo: () => ({ alert: () => ({ accept }) }) } as unknown as WebDriver);

describe('dismissOpenDialog', () => {
  let log: ToolingLog;
  let warning: jest.SpyInstance;

  beforeEach(() => {
    log = new ToolingLog();
    warning = jest.spyOn(log, 'warning').mockImplementation(() => {});
  });

  it('accepts an open dialog and logs it', async () => {
    const accept = jest.fn().mockResolvedValue(undefined);

    await expect(dismissOpenDialog(makeDriver(accept), log)).resolves.toBe(true);

    expect(accept).toHaveBeenCalledTimes(1);
    expect(warning).toHaveBeenCalledWith(
      expect.stringContaining('accepted an open browser dialog')
    );
  });

  it('is silent when there is no open dialog', async () => {
    const accept = jest.fn().mockRejectedValue(new NoSuchAlertError('no such alert'));

    await expect(dismissOpenDialog(makeDriver(accept), log)).resolves.toBe(false);

    expect(warning).not.toHaveBeenCalled();
  });

  it('logs and swallows any other failure so the caller surfaces the real error', async () => {
    const accept = jest.fn().mockRejectedValue(new InvalidArgumentError('boom'));

    await expect(dismissOpenDialog(makeDriver(accept), log)).resolves.toBe(false);

    expect(warning).toHaveBeenCalledWith(expect.stringContaining('failed to accept'));
    expect(warning).toHaveBeenCalledWith(expect.stringContaining('boom'));
  });
});

describe('isBlockedByOpenDialogError', () => {
  it('matches the broken ChromeDriver 148+ beforeunload error', () => {
    expect(
      isBlockedByOpenDialogError(
        new InvalidArgumentError('invalid argument: Unexpected dialog type beforeunload')
      )
    ).toBe(true);
  });

  it('matches the spec-compliant unexpected alert open error', () => {
    expect(isBlockedByOpenDialogError(new UnexpectedAlertOpenError('unexpected alert open'))).toBe(
      true
    );
  });

  it('does not match unrelated errors or non-errors', () => {
    expect(isBlockedByOpenDialogError(new Error('some other error'))).toBe(false);
    expect(isBlockedByOpenDialogError('Unexpected dialog type beforeunload')).toBe(false);
    expect(isBlockedByOpenDialogError(undefined)).toBe(false);
  });
});
