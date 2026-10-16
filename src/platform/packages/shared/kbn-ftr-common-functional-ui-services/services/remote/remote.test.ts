/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Session, WebDriver } from 'selenium-webdriver';
import { EMPTY } from 'rxjs';
import { Lifecycle } from '@kbn/test';
import { ToolingLog } from '@kbn/tooling-log';
import { RemoteProvider } from './remote';
import { initWebDriver } from './webdriver';
import { createBrowserVideoCapture } from './browser_video_capture';
import { Browsers } from './browsers';

jest.mock('./webdriver', () => ({ initWebDriver: jest.fn() }));
jest.mock('./browser_video_capture', () => ({ createBrowserVideoCapture: jest.fn() }));

it.each([Browsers.Firefox, Browsers.Chrome])(
  'closes %s when video initialization fails',
  async (browserType) => {
    const log = new ToolingLog();
    const lifecycle = new Lifecycle(log);
    Object.defineProperty(lifecycle, 'browserVideoRecorder', { value: {} });
    const driver = new WebDriver(Promise.resolve(new Session('video-test', {})), {
      execute: jest.fn(),
    });
    const quit = jest.spyOn(driver, 'quit').mockResolvedValue(undefined);
    jest.spyOn(driver, 'getWindowHandle').mockResolvedValue('first');
    jest.mocked(initWebDriver).mockResolvedValue({ driver, consoleLog$: EMPTY });
    jest
      .mocked(createBrowserVideoCapture)
      .mockRejectedValue(new Error('Capture connection unavailable'));
    const getService = jest.fn((name: string) => {
      if (name === 'log') return log;
      if (name === 'lifecycle') return lifecycle;
      if (name === 'config')
        return { get: (key: string) => (key === 'browser.type' ? browserType : undefined) };
      throw new Error('Unexpected service');
    });
    await expect(Reflect.apply(RemoteProvider, undefined, [{ getService }])).rejects.toThrow(
      browserType === Browsers.Firefox ? 'requires Chrome' : 'Capture connection unavailable'
    );
    await lifecycle.cleanup.trigger();
    expect(quit).toHaveBeenCalledTimes(1);
  }
);
