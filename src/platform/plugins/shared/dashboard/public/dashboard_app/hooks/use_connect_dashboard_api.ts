/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect } from 'react';
import type { DashboardApi } from '../../dashboard_api/types';

/**
 * This is a hook that connects the dashboard api to the Dashboard Agent
 * so we can modify the dashboard from the Dashboard Agent.
 */
let connectedDashboardApi: DashboardApi | undefined;

export const getConnectedDashboardApi = () => connectedDashboardApi;

export const useConnectDashboardApi = (dashboardApi: DashboardApi | undefined) => {
  useEffect(() => {
    connectedDashboardApi = dashboardApi;
    return () => {
      connectedDashboardApi = undefined;
    };
  }, [dashboardApi]);
};
