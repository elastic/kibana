/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IKibanaResponse, KibanaRequest } from '@kbn/core/server';
import type { UsageCounter } from '@kbn/usage-collection-plugin/server';

export interface DashboardApiTelemetry {
  incrementExternal: (response: IKibanaResponse, incrementBy?: number) => void;
}

export const registerDashboardApiTelemetry = (params: {
  usageCounter?: UsageCounter;
  isDashboardUiRequest: boolean;
  request: KibanaRequest;
}): DashboardApiTelemetry => {
  const { usageCounter, isDashboardUiRequest: isUi, request } = params;

  if (!usageCounter)
    return {
      incrementExternal: () => {},
    };

  const routePath = request.route.routePath ?? request.route.path;
  const counterPrefix = `${request.route.method} ${routePath}`;

  const incrementExternal: DashboardApiTelemetry['incrementExternal'] = (response, incrementBy) => {
    if (isUi) return;
    usageCounter.incrementCounter({
      counterName: `${counterPrefix} ${response.status}`,
      incrementBy,
    });
  };

  return { incrementExternal };
};
