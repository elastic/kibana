/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { DiscoverEBTPerformanceContext } from '../services/telemetry/discover_ebt_performance_provider';

export const DiscoverEBTPerformanceMockValue = {
  onTrackPluginRenderTime: jest.fn(),
  onSkipPluginRenderTime: jest.fn(),
};

export const DiscoverEBTPerformanceProviderMock: React.FC<{ children?: React.ReactNode }> = ({
  children,
}) => {
  return (
    <DiscoverEBTPerformanceContext.Provider value={DiscoverEBTPerformanceMockValue}>
      {children}
    </DiscoverEBTPerformanceContext.Provider>
  );
};
