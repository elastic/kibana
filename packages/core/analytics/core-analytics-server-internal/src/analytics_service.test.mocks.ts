/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AnalyticsClient } from '@elastic/ebt/client';
import { Subject } from 'rxjs';

export const analyticsClientMock: jest.Mocked<AnalyticsClient> = {
  optIn: jest.fn(),
  reportEvent: jest.fn(),
  registerEventType: jest.fn(),
  registerContextProvider: jest.fn(),
  removeContextProvider: jest.fn(),
  registerShipper: jest.fn(),
  telemetryCounter$: new Subject(),
  shutdown: jest.fn(),
  flush: jest.fn(),
};

jest.doMock('@elastic/ebt/client', () => ({
  createAnalytics: () => analyticsClientMock,
}));
