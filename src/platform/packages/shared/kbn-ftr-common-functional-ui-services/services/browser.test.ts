/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ToolingLog } from '@kbn/tooling-log';
import { NoSuchAlertError, UnexpectedAlertOpenError } from 'selenium-webdriver/lib/error';
import { Session, WebDriver } from 'selenium-webdriver';
import { Alert, AlertPromise } from 'selenium-webdriver/lib/webdriver';
import { runInNewContext } from 'vm';
import { BrowserService } from './browser';

describe('Browser#get', () => {
  let log: ToolingLog;
  let accept: jest.SpyInstance<Promise<void>, []>;
  let driver: WebDriver;
  let alert: Alert;

  beforeEach(() => {
    log = new ToolingLog();
    jest.spyOn(log, 'warning').mockImplementation(() => {});
    driver = new WebDriver(Promise.resolve(new Session('navigation-test', {})), {
      execute: jest.fn(),
    });
    jest.spyOn(driver, 'get').mockResolvedValue(undefined);
    jest.spyOn(driver, 'executeScript').mockResolvedValue(undefined);
    alert = new Alert(driver, 'dialog');
    accept = jest.spyOn(alert, 'accept').mockResolvedValue(undefined);
    const locator = driver.switchTo();
    jest
      .spyOn(locator, 'alert')
      .mockImplementation(
        () => new AlertPromise(driver, Promise.reject(new NoSuchAlertError('no alert')))
      );
    jest.spyOn(driver, 'switchTo').mockReturnValue(locator);
  });

  const getBrowser = (): BrowserService =>
    Reflect.construct(BrowserService, [{ getService: () => log }, 'chrome', driver]);

  afterEach(() => jest.restoreAllMocks());

  it('retries once and succeeds after dismissing a leaked dialog', async () => {
    jest
      .mocked(driver.get)
      .mockRejectedValueOnce(new UnexpectedAlertOpenError('unexpected alert open'))
      .mockResolvedValueOnce(undefined);
    jest
      .mocked(driver.switchTo().alert)
      .mockImplementationOnce(() => new AlertPromise(driver, Promise.resolve(alert)));

    await getBrowser().get('http://localhost/app');

    expect(driver.get).toHaveBeenCalledTimes(2);
    expect(jest.mocked(driver.get).mock.calls[0]).toEqual(jest.mocked(driver.get).mock.calls[1]);
    expect(accept).toHaveBeenCalledTimes(1);
    expect(driver.executeScript).toHaveBeenCalledTimes(1);
  });

  it('does not retry on an unrelated error', async () => {
    jest.mocked(driver.get).mockRejectedValueOnce(new Error('network error'));

    await expect(getBrowser().get('http://localhost/app', false)).rejects.toThrow('network error');

    expect(driver.get).toHaveBeenCalledTimes(1);
    expect(accept).not.toHaveBeenCalled();
  });

  it('propagates the error if the dialog is still blocking after the retry', async () => {
    jest
      .mocked(driver.get)
      .mockRejectedValue(new UnexpectedAlertOpenError('unexpected alert open'));
    jest
      .mocked(driver.switchTo().alert)
      .mockImplementationOnce(() => new AlertPromise(driver, Promise.resolve(alert)));

    await expect(getBrowser().get('http://localhost/app', false)).rejects.toThrow(
      'unexpected alert open'
    );

    expect(driver.get).toHaveBeenCalledTimes(2);
    expect(accept).toHaveBeenCalledTimes(1);
  });

  it('cleans the generated marker only after the forced navigation completes', async () => {
    let loaded = false;
    jest.spyOn(Date, 'now').mockReturnValue(1700000000000);
    jest.mocked(driver.get).mockImplementation(async () => {
      loaded = true;
    });
    jest.mocked(driver.executeScript).mockImplementation(async () => {
      expect(loaded).toBe(true);
    });
    await getBrowser().get('http://localhost/app/visualize?other=keep#/create');
    expect(driver.get).toHaveBeenCalledWith(
      'http://localhost/app/visualize?other=keep&_t=1700000000000#/create'
    );
    expect(driver.executeScript).toHaveBeenCalledTimes(1);
  });

  it('preserves the destination query, hash, and router state without another navigation', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1700000000000);
    await getBrowser().get('http://localhost/app/visualize?other=keep#/create');
    const [script, timestamp] = jest.mocked(driver.executeScript).mock.calls[0];
    if (typeof script !== 'function') throw new Error('Expected browser cleanup callback');
    const state = { key: 'router-entry', position: 7 };
    const replaceState = jest.fn();
    runInNewContext(`(${script.toString()})(timestamp)`, {
      URL,
      timestamp,
      window: {
        location: {
          href: 'http://localhost/app/visualize?other=hello%20world&opaque=~%2f&_t=1700000000000#/create',
        },
        history: { state, replaceState },
      },
    });
    expect(replaceState).toHaveBeenCalledWith(
      state,
      '',
      'http://localhost/app/visualize?other=hello%20world&opaque=~%2f#/create'
    );
    expect(driver.get).toHaveBeenCalledTimes(1);
  });

  it('does not remove a different timestamp supplied by a redirected destination', async () => {
    await getBrowser().get('http://localhost/app/visualize');
    const [script, timestamp] = jest.mocked(driver.executeScript).mock.calls[0];
    if (typeof script !== 'function') throw new Error('Expected browser cleanup callback');
    const replaceState = jest.fn();
    runInNewContext(`(${script.toString()})(timestamp)`, {
      URL,
      timestamp,
      window: {
        location: { href: 'http://localhost/login?_t=destination' },
        history: { state: null, replaceState },
      },
    });
    expect(replaceState).not.toHaveBeenCalled();
  });

  it('leaves an intentional dialog open rather than dismissing it for timestamp cleanup', async () => {
    jest
      .mocked(driver.executeScript)
      .mockRejectedValueOnce(new UnexpectedAlertOpenError('destination dialog'));
    await expect(getBrowser().get('http://localhost/app/visualize')).resolves.toBeUndefined();
    expect(driver.get).toHaveBeenCalledTimes(1);
    expect(accept).not.toHaveBeenCalled();
    expect(driver.executeScript).toHaveBeenCalledTimes(1);
  });

  it('skips cleanup if a dialog opens just before the script command', async () => {
    jest
      .mocked(driver.executeScript)
      .mockRejectedValueOnce(new UnexpectedAlertOpenError('destination dialog'));
    await expect(getBrowser().get('http://localhost/app')).resolves.toBeUndefined();
    expect(driver.get).toHaveBeenCalledTimes(1);
    expect(accept).not.toHaveBeenCalled();
  });

  it('does not pre-check or dismiss prompts before cleanup', async () => {
    jest
      .mocked(driver.executeScript)
      .mockRejectedValueOnce(new UnexpectedAlertOpenError('destination dialog'));
    await getBrowser().get('http://localhost/app');
    expect(driver.switchTo().alert).not.toHaveBeenCalled();
    expect(accept).not.toHaveBeenCalled();
  });

  it('propagates unrelated cleanup failures without retrying navigation', async () => {
    jest.mocked(driver.executeScript).mockRejectedValueOnce(new Error('Browser connection failed'));
    await expect(getBrowser().get('http://localhost/app/visualize')).rejects.toThrow(
      'Browser connection failed'
    );
    expect(driver.get).toHaveBeenCalledTimes(1);
  });

  it('does not clean a URL when timestamp insertion is disabled', async () => {
    await getBrowser().get('http://localhost/app/visualize?_t=caller', false);
    expect(driver.get).toHaveBeenCalledWith('http://localhost/app/visualize?_t=caller');
    expect(driver.executeScript).not.toHaveBeenCalled();
  });

  it('does not execute history cleanup on a non-HTTP destination', async () => {
    await getBrowser().get('about:blank');
    expect(driver.get).toHaveBeenCalledTimes(1);
    expect(driver.executeScript).not.toHaveBeenCalled();
  });
});
