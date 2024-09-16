/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PluginServiceFactory } from '@kbn/presentation-util-plugin/public';
import { screenshotModePluginMock } from '@kbn/screenshot-mode-plugin/public/mocks';
import { DashboardScreenshotModeService } from './types';

type ScreenshotModeServiceFactory = PluginServiceFactory<DashboardScreenshotModeService>;

export const screenshotModeServiceFactory: ScreenshotModeServiceFactory = () => {
  const pluginMock = screenshotModePluginMock.createStartContract();

  return {
    isScreenshotMode: pluginMock.isScreenshotMode,
    getScreenshotContext: pluginMock.getScreenshotContext,
  };
};
