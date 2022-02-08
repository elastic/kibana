/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DeeplyMockedKeys } from '@kbn/utility-types/jest';
import type { ScreenshotModePluginSetup, ScreenshotModePluginStart } from './types';

export const screenshotModePluginMock = {
  createSetupContract: (): DeeplyMockedKeys<ScreenshotModePluginSetup> => ({
    getScreenshotContext: jest.fn(),
    isScreenshotMode: jest.fn(() => false),
  }),
  createStartContract: (): DeeplyMockedKeys<ScreenshotModePluginStart> => ({
    getScreenshotContext: jest.fn(),
    isScreenshotMode: jest.fn(() => false),
  }),
};
