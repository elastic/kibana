/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { ScreenshotModePlugin } from './plugin';
import { setScreenshotModeEnabled, setScreenshotModeDisabled } from '../common';

describe('Screenshot mode public', () => {
  let plugin: ScreenshotModePlugin;

  beforeEach(() => {
    plugin = new ScreenshotModePlugin();
  });

  afterAll(() => {
    setScreenshotModeDisabled();
  });

  describe('public contract', () => {
    it('detects screenshot mode "true"', () => {
      setScreenshotModeEnabled();
      const screenshotMode = plugin.setup(coreMock.createSetup());
      expect(screenshotMode.isScreenshotMode()).toBe(true);
    });

    it('detects screenshot mode "false"', () => {
      setScreenshotModeDisabled();
      const screenshotMode = plugin.setup(coreMock.createSetup());
      expect(screenshotMode.isScreenshotMode()).toBe(false);
    });
  });
});
