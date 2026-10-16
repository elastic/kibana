/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { NoSuchSessionError, NoSuchWindowError } from 'selenium-webdriver/lib/error';
import type { FtrProviderContext } from '../ftr_provider_context';
import type { BrowserConfig } from './webdriver';
import { initWebDriver } from './webdriver';
import { Browsers } from './browsers';
import { dismissOpenDialog } from './dismiss_open_dialog';
import { createBrowserVideoCapture } from './browser_video_capture';

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
  lifecycle.cleanup.add(async () => {
    await tryWebDriverCall(async () => {
      await driver.quit();
    });
  });
  let recordingWindow: string | undefined;
  let recordingWindowVersion = 0;
  if (lifecycle.browserVideoRecorder) {
    if (![Browsers.Chrome, Browsers.ChromiumEdge].includes(browserType)) {
      throw new Error('FTR browser video recording requires Chrome or Chromium Edge');
    }
    recordingWindow = await driver.getWindowHandle();
    const capture = await createBrowserVideoCapture(driver, () => recordingWindow);
    lifecycle.browserVideoRecorder.setCaptureFrame(capture.captureFrame, capture.close);
  }
  if (lifecycle.waitRecorder) {
    driver.wait = new Proxy(driver.wait, {
      apply(target, thisArg, args) {
        const finish = lifecycle.waitRecorder?.beginWait('webdriverWait', 'driver.wait');
        try {
          const result = Reflect.apply(target, thisArg, args);
          Promise.resolve(result).then(
            () => finish?.(),
            () => finish?.()
          );
          return result;
        } catch (error) {
          finish?.();
          throw error;
        }
      },
    });
    driver.execute = new Proxy(driver.execute, {
      apply(target, thisArg, args) {
        const [command] = args;
        const name: string = command.getName();
        if (
          lifecycle.browserVideoRecorder &&
          ['switchToWindow', 'newWindow', 'close'].includes(name)
        ) {
          const previousWindow = recordingWindow;
          const windowVersion = ++recordingWindowVersion;
          recordingWindow = undefined;
          return Promise.resolve(Reflect.apply(target, thisArg, args)).then(
            (result) => {
              if (name !== 'close') {
                // Resolve named windows without delaying the original command's result.
                driver.getWindowHandle().then(
                  (handle) => {
                    if (recordingWindowVersion === windowVersion) recordingWindow = handle;
                  },
                  (error) => {
                    log.debug(
                      'Unable to resolve active window for video capture: %s',
                      error.message
                    );
                  }
                );
              }
              return result;
            },
            (error) => {
              if (recordingWindowVersion === windowVersion) recordingWindow = previousWindow;
              throw error;
            }
          );
        }
        if (
          !['findElement', 'findElements', 'findChildElement', 'findChildElements'].includes(name)
        ) {
          return Reflect.apply(target, thisArg, args);
        }
        const selector = command.getParameters().value;
        const label = typeof selector === 'string' ? `${name}(${selector})` : name;
        const finish = lifecycle.waitRecorder?.beginWait('lookup', label);
        try {
          const result = Reflect.apply(target, thisArg, args);
          Promise.resolve(result).then(
            () => finish?.(),
            () => finish?.()
          );
          return result;
        } catch (error) {
          finish?.();
          throw error;
        }
      },
    });
  }
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
    if (lifecycle.isAborting) {
      return;
    }
    // a `beforeunload` dialog leaked by the previous suite blocks `getRect` below (#289092)
    await dismissOpenDialog(driver, log);
    windowSizeStack.unshift(await driver.manage().window().getRect());
  });

  lifecycle.beforeEachTest.add(async () => {
    if (lifecycle.isAborting) {
      return;
    }
    await driver.manage().setTimeouts({ implicit: config.get('timeouts.find') });
  });

  lifecycle.afterTestSuite.add(async () => {
    // skip WebDriver calls that could themselves hang against a dead browser/session
    if (lifecycle.isAborting) {
      windowSizeStack.shift();
      return;
    }
    await tryWebDriverCall(async () => {
      await dismissOpenDialog(driver, log);
      // global cleanup
      const { width, height } = windowSizeStack.shift()!;
      await driver.manage().window().setRect({ width, height });
      await clearBrowserStorage('sessionStorage');
      await clearBrowserStorage('localStorage');
    });
  });

  return { driver, browserType, consoleLog$ };
}
