/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AnalyticsClient } from '@kbn/analytics-client';
import { Subject } from 'rxjs';

export const analyticsClientMock: jest.Mocked<AnalyticsClient> = {
  optIn: jest.fn(),
  reportEvent: jest.fn(),
  registerEventType: jest.fn(),
  registerContextProvider: jest.fn(),
  removeContextProvider: jest.fn(),
  registerShipper: jest.fn(),
  telemetryCounter$: new Subject(),
  flush: jest.fn(),
  shutdown: jest.fn(),
};

jest.doMock('@kbn/analytics-client', () => ({
  createAnalytics: () => analyticsClientMock,
}));
