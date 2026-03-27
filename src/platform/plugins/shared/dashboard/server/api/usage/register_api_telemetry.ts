/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IKibanaResponse, KibanaRequest } from '@kbn/core/server';
import { X_ELASTIC_INTERNAL_ORIGIN_REQUEST } from '@kbn/core-http-common';
import type { UsageCounter } from '@kbn/usage-collection-plugin/server';

export interface DashboardApiTelemetry {
  incrementCounter: (response: IKibanaResponse, incrementBy?: number) => void;
}

function isKibanaOrigin(request: KibanaRequest) {
  const origin = request.headers[X_ELASTIC_INTERNAL_ORIGIN_REQUEST];
  return typeof origin === 'string' && origin.toLocaleLowerCase() === 'kibana';
}

export const registerDashboardApiTelemetry = (params: {
  usageCounter?: UsageCounter;
  request: KibanaRequest;
}): DashboardApiTelemetry => {
  const { usageCounter, request } = params;
  const routePath = request.route.routePath;

  /**
   * Only count external API calls, ignoring calls originating from within Kibana itself.
   */
  if (!usageCounter || !routePath || isKibanaOrigin(request)) {
    return {
      incrementCounter: () => {},
    };
  }

  const counterPrefix = `${request.route.method} ${routePath}`;

  const incrementCounter: DashboardApiTelemetry['incrementCounter'] = (response, incrementBy) => {
    usageCounter.incrementCounter({
      counterName: `${counterPrefix} ${response.status}`,
      incrementBy,
    });
  };

  return { incrementCounter };
};
