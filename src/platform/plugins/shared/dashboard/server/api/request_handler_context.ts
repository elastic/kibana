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
import type { DashboardApiTelemetry } from './usage/register_api_telemetry';
import { registerDashboardApiTelemetry } from './usage/register_api_telemetry';
import { isDashboardUiRequest } from './usage/is_dashboard_ui_request';

export interface DashboardApiRouteHandlerContext {
  isDashboardUiRequest: boolean;
  telemetry: DashboardApiTelemetry;
}

export type DashboardApiRequestHandlerContext = CustomRequestHandlerContext<{
  dashboardApi: DashboardApiRouteHandlerContext;
}>;

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
        telemetry: registerDashboardApiTelemetry({
          usageCounter,
          isDashboardUiRequest: isUi,
          request,
        }),
      };
    }
  );
};
