/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ScreenshotModePluginSetup } from 'src/plugins/screenshot_mode/public';
import { HomePublicPluginSetup } from 'src/plugins/home/public';
import { CloudSetup } from './services/cloud';

export const screenshotModeMock = {
  isScreenshotMode: jest.fn(),
  getScreenshotContext: jest.fn(),
} as ScreenshotModePluginSetup;

export const homeMock = {
  welcomeScreen: {
    registerOnRendered: jest.fn(),
    registerTelemetryNoticeRenderer: jest.fn(),
  },
} as unknown as HomePublicPluginSetup;

export const cloudMock = {
  isCloudEnabled: true,
} as CloudSetup;
