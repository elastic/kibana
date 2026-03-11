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

interface DashboardAgentService {
  attachDashboard: (dashboardApi: DashboardApi | undefined) => void;
}

let dashboardAgentService: DashboardAgentService | undefined;

export const setDashboardAgentService = (service: DashboardAgentService | undefined) => {
  dashboardAgentService = service;
};

export const useDashboardAgentContext = (dashboardApi: DashboardApi | undefined) => {
  useEffect(() => {
    const service = dashboardAgentService;
    if (!service) {
      return;
    }
    service.attachDashboard(dashboardApi);
    return () => {
      service.attachDashboard(undefined);
    };
  }, [dashboardApi]);
};
