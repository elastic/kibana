/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { analyticsServiceMock } from '@kbn/core-analytics-browser-mocks';
import { PluginServiceFactory } from '@kbn/presentation-util-plugin/public';
import { DashboardAnalyticsService } from './types';

type AnalyticsServiceFactory = PluginServiceFactory<DashboardAnalyticsService>;

export const analyticsServiceFactory: AnalyticsServiceFactory = () => {
  const pluginMock = analyticsServiceMock.createAnalyticsServiceStart();

  return {
    reportEvent: pluginMock.reportEvent,
  };
};
