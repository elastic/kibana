/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ToolingLog } from '@kbn/tooling-log';
import { UnexpectedAlertOpenError } from 'selenium-webdriver/lib/error';
import type { FtrProviderContext } from './ftr_provider_context';
import { BrowserService } from './browser';

describe('Browser#get', () => {
  let log: ToolingLog;
  let accept: jest.Mock;
  let driver: { get: jest.Mock; switchTo: () => { alert: () => { accept: jest.Mock } } };

  beforeEach(() => {
    log = new ToolingLog();
    jest.spyOn(log, 'warning').mockImplementation(() => {});
    accept = jest.fn();
    driver = { get: jest.fn(), switchTo: () => ({ alert: () => ({ accept }) }) };
  });

  const getBrowser = () => {
    const ctx = { getService: () => log } as unknown as FtrProviderContext;
    return new BrowserService(ctx, 'chrome', driver as any);
  };

  it('retries once and succeeds after dismissing a leaked dialog', async () => {
    driver.get
      .mockRejectedValueOnce(new UnexpectedAlertOpenError('unexpected alert open'))
      .mockResolvedValueOnce(undefined);
    accept.mockResolvedValue(undefined);

    await getBrowser().get('http://localhost/app', false);

    expect(driver.get).toHaveBeenCalledTimes(2);
    expect(accept).toHaveBeenCalledTimes(1);
  });

  it('does not retry on an unrelated error', async () => {
    driver.get.mockRejectedValueOnce(new Error('network error'));

    await expect(getBrowser().get('http://localhost/app', false)).rejects.toThrow('network error');

    expect(driver.get).toHaveBeenCalledTimes(1);
    expect(accept).not.toHaveBeenCalled();
  });

  it('propagates the error if the dialog is still blocking after the retry', async () => {
    driver.get.mockRejectedValue(new UnexpectedAlertOpenError('unexpected alert open'));
    accept.mockResolvedValue(undefined);

    await expect(getBrowser().get('http://localhost/app', false)).rejects.toThrow(
      'unexpected alert open'
    );

    expect(driver.get).toHaveBeenCalledTimes(2);
    expect(accept).toHaveBeenCalledTimes(1);
  });
});
