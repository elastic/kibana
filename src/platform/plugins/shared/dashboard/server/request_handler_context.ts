/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup, CustomRequestHandlerContext } from '@kbn/core/server';
import type { UsageCounter } from '@kbn/usage-collection-plugin/server';
import { isDashboardUiRequest } from './api/telemetry/is_dashboard_ui_request';

export interface DashboardApiTelemetryFacade {
  incrementExternal: (counterName: string, incrementBy?: number) => void;
  incrementExternalByType: (params: {
    totalCounterName: string;
    byTypeCounterName: (type: string) => string;
    byType: Record<string, number>;
  }) => void;
}

export interface DashboardApiRouteHandlerContext {
  isDashboardUiRequest: boolean;
  telemetry: DashboardApiTelemetryFacade;
}

export type DashboardApiRequestHandlerContext = CustomRequestHandlerContext<{
  dashboardApi: DashboardApiRouteHandlerContext;
}>;

export const createDashboardApiTelemetryFacade = (params: {
  usageCounter?: UsageCounter;
  isDashboardUiRequest: boolean;
}): DashboardApiTelemetryFacade => {
  const { usageCounter, isDashboardUiRequest: isUi } = params;

  const noop: DashboardApiTelemetryFacade = {
    incrementExternal: () => {},
    incrementExternalByType: () => {},
  };

  if (!usageCounter) return noop;

  const incrementExternal: DashboardApiTelemetryFacade['incrementExternal'] = (
    counterName,
    incrementBy
  ) => {
    if (isUi) return;
    usageCounter.incrementCounter({ counterName, incrementBy });
  };

  const incrementExternalByType: DashboardApiTelemetryFacade['incrementExternalByType'] = ({
    totalCounterName,
    byTypeCounterName,
    byType,
  }) => {
    if (isUi) return;

    let total = 0;
    for (const count of Object.values(byType)) total += count;
    if (total > 0) {
      incrementExternal(totalCounterName, total);
    }
    for (const [type, count] of Object.entries(byType)) {
      if (count > 0) {
        incrementExternal(byTypeCounterName(type), count);
      }
    }
  };

  return { incrementExternal, incrementExternalByType };
};

export const registerDashboardApiRouteHandlerContext = (
  core: CoreSetup,
  usageCounter?: UsageCounter
) => {
  core.http.registerRouteHandlerContext<DashboardApiRequestHandlerContext, 'dashboardApi'>(
    'dashboardApi',
    async (_context, request) => {
      const isUi = isDashboardUiRequest(request.headers);
      return {
        isDashboardUiRequest: isUi,
        telemetry: createDashboardApiTelemetryFacade({ usageCounter, isDashboardUiRequest: isUi }),
      };
    }
  );
};
