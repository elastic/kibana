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

export async function telemetryHandler<TResponse extends IKibanaResponse>(
  request: KibanaRequest,
  usageCounter: UsageCounter | undefined,
  agenticUsageCounter: UsageCounter | undefined,
  handler: () => Promise<TResponse> | TResponse
): Promise<TResponse> {
  const handlerResponse = await handler();

  const origin = request.headers[X_ELASTIC_INTERNAL_ORIGIN_REQUEST];
  const isKibanaOrigin = typeof origin === 'string' && origin.toLocaleLowerCase() === 'kibana';
  const routePath = request.route.routePath;

  if (isKibanaOrigin || !routePath) {
    return handlerResponse;
  }

  const counterName = `${request.route.method} ${routePath} ${handlerResponse.status}`;

  if (usageCounter) {
    usageCounter.incrementCounter({ counterName });
  }

  if (agenticUsageCounter) {
    const userAgent = [request.headers['user-agent'] ?? ''].flat();
    if (userAgent.some((v) => v.toLowerCase().includes('elastic-agentic'))) {
      agenticUsageCounter.incrementCounter({ counterName });
    }
  }

  return handlerResponse;
}
