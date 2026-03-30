/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  CustomRequestHandlerContext,
  IContextProvider,
  IKibanaResponse,
  KibanaRequest,
} from '@kbn/core/server';
import { X_ELASTIC_INTERNAL_ORIGIN_REQUEST } from '@kbn/core-http-common';
import type { UsageCounter } from '@kbn/usage-collection-plugin/server';

interface DashboardApiTelemetry {
  incrementCounter: (response: IKibanaResponse, incrementBy?: number) => void;
}

interface DashboardApiRouteHandlerContext {
  getTelemetryClient(): DashboardApiTelemetry | undefined;
}

export type DashboardApiRequestHandlerContext = CustomRequestHandlerContext<{
  dashboardApi: DashboardApiRouteHandlerContext;
}>;

function getTelemetryClientForRequest(
  request: KibanaRequest,
  usageCounter?: UsageCounter
): DashboardApiTelemetry | undefined {
  const isKibanaOrigin = () => {
    const origin = request.headers[X_ELASTIC_INTERNAL_ORIGIN_REQUEST];
    return typeof origin === 'string' && origin.toLocaleLowerCase() === 'kibana';
  };
  if (!usageCounter || isKibanaOrigin() || !request.route.routePath) {
    return;
  }

  const routePath = request.route.routePath;
  const counterPrefix = `${request.route.method} ${routePath}`;
  return {
    incrementCounter: (response, incrementBy) => {
      usageCounter.incrementCounter({
        counterName: `${counterPrefix} ${response.status}`,
        incrementBy,
      });
    },
  };
}

export function createRouteHandlerContext(
  usageCounter?: UsageCounter
): IContextProvider<DashboardApiRequestHandlerContext, 'dashboardApi'> {
  return (_context, request) => {
    return {
      getTelemetryClient: () => getTelemetryClientForRequest(request, usageCounter),
    };
  };
}
