/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { analyticsServiceMock, coreMock, themeServiceMock } from '@kbn/core/public/mocks';
import { PluginServiceFactory } from '@kbn/presentation-util-plugin/public';
import { ControlsCoreService } from './types';

export type CoreServiceFactory = PluginServiceFactory<ControlsCoreService>;

export const coreServiceFactory: CoreServiceFactory = () => {
  const corePluginMock = coreMock.createStart();
  return {
    analytics: analyticsServiceMock.createAnalyticsServiceStart(),
    theme: themeServiceMock.createSetupContract(),
    i18n: corePluginMock.i18n,
    notifications: corePluginMock.notifications,
  };
};
