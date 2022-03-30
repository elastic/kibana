/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Subject } from 'rxjs';
import type { IAnalyticsClient } from './types';

function createMockedAnalyticsClient(): jest.Mocked<IAnalyticsClient> {
  return {
    optIn: jest.fn().mockImplementation(),
    reportEvent: jest.fn().mockImplementation(),
    registerEventType: jest.fn().mockImplementation(),
    registerContextProvider: jest.fn().mockImplementation(),
    registerShipper: jest.fn().mockImplementation(),
    telemetryCounter$: new Subject(),
  };
}

export const analyticsClientMock = {
  create: createMockedAnalyticsClient,
};
