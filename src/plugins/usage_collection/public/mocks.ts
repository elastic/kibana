/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ApplicationUsageTracker } from '@kbn/analytics';
import { UsageCollectionSetup, METRIC_TYPE } from '.';

export type Setup = jest.Mocked<UsageCollectionSetup>;

export const createApplicationUsageTrackerMock = (): ApplicationUsageTracker => {
  const applicationUsageTrackerMock: jest.Mocked<ApplicationUsageTracker> = {
    setCurrentAppId: jest.fn(),
    trackApplicationViewUsage: jest.fn(),
  } as any;

  return applicationUsageTrackerMock;
};

const createSetupContract = (): Setup => {
  const applicationUsageTrackerMock = createApplicationUsageTrackerMock();
  const setupContract: Setup = {
    applicationUsageTracker: applicationUsageTrackerMock,
    allowTrackUserAgent: jest.fn(),
    reportUiCounter: jest.fn(),
    METRIC_TYPE,
    __LEGACY: {
      appChanged: jest.fn(),
    },
  };

  return setupContract;
};

export const usageCollectionPluginMock = {
  createSetupContract,
};
