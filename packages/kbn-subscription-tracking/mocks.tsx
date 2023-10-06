/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC } from 'react';
import { analyticsClientMock } from '@kbn/analytics-client/src/mocks';

import { SubscriptionTrackingProvider } from './src/services';

const analyticsClientMockInst = analyticsClientMock.create();

/**
 * Mock for the external services provider. Only use in tests!
 */
export const MockSubscriptionTrackingProvider: FC = ({ children }) => {
  return (
    <SubscriptionTrackingProvider
      navigateToApp={jest.fn()}
      analyticsClient={analyticsClientMockInst}
    >
      {children}
    </SubscriptionTrackingProvider>
  );
};
