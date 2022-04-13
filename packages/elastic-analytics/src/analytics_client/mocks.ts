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
    optIn: jest.fn(),
    reportEvent: jest.fn(),
    registerEventType: jest.fn(),
    registerContextProvider: jest.fn(),
    removeContextProvider: jest.fn(),
    registerShipper: jest.fn(),
    telemetryCounter$: new Subject(),
    shutdown: jest.fn(),
  };
}

export const analyticsClientMock = {
  create: createMockedAnalyticsClient,
};
