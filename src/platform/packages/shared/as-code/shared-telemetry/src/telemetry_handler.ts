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

export const ELASTIC_AGENTIC_USER_AGENT = 'elastic-agentic';
export const AGENTIC_COUNTER_TYPE = 'agentic';

const isAgenticRequest = (request: KibanaRequest): boolean => {
  const userAgent = [request.headers['user-agent'] ?? ''].flat();
  return userAgent.some((v) => v.toLowerCase().includes(ELASTIC_AGENTIC_USER_AGENT));
};

/**
 * Wraps a route handler with API usage telemetry. Skips counting for
 * Kibana-internal requests (x-elastic-internal-origin: kibana) and routes
 * without a registered routePath.
 *
 * @param request - The incoming Kibana request.
 * @param options - Telemetry options.
 * @param options.usageCounter - Counter to increment on each tracked request.
 * @param options.trackAgentic - When true, also increments the counter with
 *   `counterType: AGENTIC_COUNTER_TYPE` for requests whose User-Agent contains
 *   the {@link ELASTIC_AGENTIC_USER_AGENT} string.
 * @param handler - The route handler to execute.
 */
export async function telemetryHandler<TResponse extends IKibanaResponse>(
  request: KibanaRequest,
  options: { usageCounter?: UsageCounter; trackAgentic?: boolean },
  handler: () => Promise<TResponse> | TResponse
): Promise<TResponse> {
  const handlerResponse = await handler();

  const origin = request.headers[X_ELASTIC_INTERNAL_ORIGIN_REQUEST];
  const isKibanaOrigin = typeof origin === 'string' && origin.toLocaleLowerCase() === 'kibana';
  const routePath = request.route.routePath;

  if (isKibanaOrigin || !routePath) {
    return handlerResponse;
  }

  const { usageCounter, trackAgentic } = options ?? {};
  const counterName = `${request.route.method} ${routePath} ${handlerResponse.status}`;

  if (usageCounter) {
    usageCounter.incrementCounter({ counterName });

    if (trackAgentic && isAgenticRequest(request)) {
      usageCounter.incrementCounter({ counterName, counterType: AGENTIC_COUNTER_TYPE });
    }
  }

  return handlerResponse;
}
