/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { ApplicationUsageTracker } from '@kbn/analytics';
import { UsageCollectionSetup } from '.';
import { ApplicationUsageContext } from './components/track_application_view';

export type Setup = jest.Mocked<UsageCollectionSetup>;

// This is to avoid having to mock every private property of the class
type ApplicationUsageTrackerPublic = Pick<ApplicationUsageTracker, keyof ApplicationUsageTracker>;

export const createApplicationUsageTrackerMock = (): ApplicationUsageTrackerPublic => {
  const applicationUsageTrackerMock: jest.Mocked<ApplicationUsageTrackerPublic> = {
    trackApplicationViewUsage: jest.fn(),
    flushTrackedView: jest.fn(),
    updateViewClickCounter: jest.fn(),
    setCurrentAppId: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    pauseTrackingAll: jest.fn(),
    resumeTrackingAll: jest.fn(),
  };

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
    reportUiCounter: jest.fn(),
  };

  return setupContract;
};

export const usageCollectionPluginMock = {
  createSetupContract,
};
