/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import type { AnalyticsClient } from '@elastic/analytics';
import { createAnalytics } from '@elastic/analytics';
import { loggerMock } from '@kbn/logging-mocks';
import type { AnalyticsService } from './analytics_service';

type AnalyticsServiceContract = PublicMethodsOf<AnalyticsService>;

const createAnalyticsClientMock = (): jest.Mocked<AnalyticsClient> => {
  const analyticsClient = createAnalytics({
    isDev: true,
    sendTo: 'staging',
    logger: loggerMock.create(),
  });

  return {
    optIn: jest.fn().mockImplementation(analyticsClient.optIn),
    reportEvent: jest.fn().mockImplementation(analyticsClient.reportEvent),
    registerEventType: jest.fn().mockImplementation(analyticsClient.registerEventType),
    registerContextProvider: jest.fn().mockImplementation(analyticsClient.registerContextProvider),
    registerShipper: jest.fn().mockImplementation(analyticsClient.registerShipper),
    telemetryCounter$: analyticsClient.telemetryCounter$,
  };
};

const createAnalyticsServiceMock = (): jest.Mocked<AnalyticsServiceContract> => {
  return {
    setup: jest.fn().mockImplementation(createAnalyticsClientMock),
    start: jest.fn().mockImplementation(createAnalyticsClientMock),
  };
};

export const analyticsServiceMock = {
  create: createAnalyticsServiceMock,
  createAnalyticsServicePreboot: createAnalyticsClientMock,
  createAnalyticsServiceSetup: createAnalyticsClientMock,
  createAnalyticsServiceStart: createAnalyticsClientMock,
};
