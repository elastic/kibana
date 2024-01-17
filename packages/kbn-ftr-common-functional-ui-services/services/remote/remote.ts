/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { NoSuchSessionError, NoSuchWindowError } from 'selenium-webdriver/lib/error';
import { FtrProviderContext } from '../ftr_provider_context';
import { initWebDriver, BrowserConfig } from './webdriver';
import { Browsers } from './browsers';

export async function RemoteProvider({ getService }: FtrProviderContext) {
  const lifecycle = getService('lifecycle');
  const log = getService('log');
  const config = getService('config');
  const browserType: Browsers = config.get('browser.type');
  type BrowserStorage = 'sessionStorage' | 'localStorage';

  const clearBrowserStorage = async (storageType: BrowserStorage) => {
    try {
      await driver.executeScript(`window.${storageType}.clear();`);
    } catch (error) {
      if (!error.message.includes(`Failed to read the '${storageType}' property from 'Window'`)) {
        throw error;
      }
    }
  };

  const tryWebDriverCall = async (command: () => Promise<void>) => {
    // Since WebDriver session may be deleted, we fail silently. Use only in after hooks.
    try {
      await command();
    } catch (error) {
      if (error instanceof NoSuchSessionError) {
        // Avoid duplicating NoSuchSessionError error output on each hook
        // https://developer.mozilla.org/en-US/docs/Web/WebDriver/Errors/InvalidSessionID
        log.error('WebDriver session is no longer valid');
      } else if (error instanceof NoSuchWindowError) {
        // Avoid duplicating NoSuchWindowError error output on each hook
        // https://developer.mozilla.org/en-US/docs/Web/WebDriver/Errors
        log.error('Browser window is already closed');
      } else {
        throw error;
      }
    }
  };

  const browserConfig: BrowserConfig = {
    logPollingMs: config.get('browser.logPollingMs'),
    acceptInsecureCerts: config.get('browser.acceptInsecureCerts'),
  };

  const { driver, consoleLog$ } = await initWebDriver(log, browserType, lifecycle, browserConfig);
  const caps = await driver.getCapabilities();

  log.info(`Remote initialized: ${caps.get('browserName')} ${caps.get('browserVersion')}}`);

  if ([Browsers.Chrome, Browsers.ChromiumEdge].includes(browserType)) {
    log.info(
      `${browserType}driver version: ${caps.get(browserType)[`${browserType}driverVersion`]}`
    );
  }

  if (Browsers.Firefox === browserType) {
    log.info(`Geckodriver version: ${caps.get('moz:geckodriverVersion')}`);
  }

  consoleLog$.subscribe({
    next({ message, level }) {
      const msg = message.replace(/\\n/g, '\n');
      log[level === 'SEVERE' || level === 'error' ? 'warning' : 'debug'](
        `browser[${level}] ${msg}`
      );
    },
  });

  lifecycle.beforeTests.add(async () => {
    // hard coded default, can be overridden per suite using `browser.setWindowSize()`
    // and will be automatically reverted after each suite
    await driver.manage().window().setRect({ width: 1600, height: 1000 });
  });

  const windowSizeStack: Array<{ width: number; height: number }> = [];
  lifecycle.beforeTestSuite.add(async () => {
    windowSizeStack.unshift(await driver.manage().window().getRect());
  });

  lifecycle.beforeEachTest.add(async () => {
    await driver.manage().setTimeouts({ implicit: config.get('timeouts.find') });
  });

  lifecycle.afterTestSuite.add(async () => {
    await tryWebDriverCall(async () => {
      const { width, height } = windowSizeStack.shift()!;
      await driver.manage().window().setRect({ width, height });
      await clearBrowserStorage('sessionStorage');
      await clearBrowserStorage('localStorage');
    });
  });

  lifecycle.cleanup.add(async () => {
    await tryWebDriverCall(async () => {
      await driver.quit();
    });
  });

  return { driver, browserType, consoleLog$ };
}
