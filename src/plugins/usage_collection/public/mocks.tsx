/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { ApplicationUsageTracker } from '@kbn/analytics';
import { UsageCollectionSetup, METRIC_TYPE } from '.';
import { ApplicationUsageContext } from './components/track_application_view';

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
    components: {
      ApplicationUsageTrackingProvider: (props) => (
        <ApplicationUsageContext.Provider value={applicationUsageTrackerMock}>
          {props.children}
        </ApplicationUsageContext.Provider>
      ),
    },
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
