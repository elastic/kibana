/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { IAnalyticsClient } from './types';
import { AnalyticsClient } from './analytics_client';

function createMockedAnalyticsClient(): jest.Mocked<IAnalyticsClient> {
  const analyticsClient = new AnalyticsClient({
    isDev: true,
    sendTo: 'production',
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
}

export const analyticsClientMock = {
  create: createMockedAnalyticsClient,
};
