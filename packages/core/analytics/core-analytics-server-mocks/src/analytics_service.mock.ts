/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Subject } from 'rxjs';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type {
  AnalyticsServiceSetup,
  AnalyticsServiceStart,
  AnalyticsServicePreboot,
} from '@kbn/core-analytics-server';
import type { AnalyticsService } from '@kbn/core-analytics-server-internal';

type AnalyticsServiceContract = PublicMethodsOf<AnalyticsService>;

const createAnalyticsServicePreboot = (): jest.Mocked<AnalyticsServicePreboot> => {
  return {
    optIn: jest.fn(),
    reportEvent: jest.fn(),
    registerEventType: jest.fn(),
    registerContextProvider: jest.fn(),
    removeContextProvider: jest.fn(),
    registerShipper: jest.fn(),
    telemetryCounter$: new Subject(),
  };
};

const createAnalyticsServiceSetup = (): jest.Mocked<AnalyticsServiceSetup> => {
  return {
    optIn: jest.fn(),
    reportEvent: jest.fn(),
    registerEventType: jest.fn(),
    registerContextProvider: jest.fn(),
    removeContextProvider: jest.fn(),
    registerShipper: jest.fn(),
    telemetryCounter$: new Subject(),
  };
};

const createAnalyticsServiceStart = (): jest.Mocked<AnalyticsServiceStart> => {
  return {
    optIn: jest.fn(),
    reportEvent: jest.fn(),
    telemetryCounter$: new Subject(),
  };
};

const createAnalyticsServiceMock = (): jest.Mocked<AnalyticsServiceContract> => {
  return {
    preboot: jest.fn().mockImplementation(createAnalyticsServicePreboot),
    setup: jest.fn().mockImplementation(createAnalyticsServiceSetup),
    start: jest.fn().mockImplementation(createAnalyticsServiceStart),
    stop: jest.fn(),
  };
};

export const analyticsServiceMock = {
  create: createAnalyticsServiceMock,
  createAnalyticsServicePreboot,
  createAnalyticsServiceSetup,
  createAnalyticsServiceStart,
};
