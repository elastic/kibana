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

export const ELASTIC_CLI_USER_AGENT_PREFIX = 'elastic-cli/';
export const ELASTIC_CLIENT_META_HEADER = 'x-elastic-client-meta';
export const AGENTIC_COUNTER_TYPE = 'agentic';
export const ELASTIC_CLI_COUNTER_TYPE_PREFIX = 'elastic-cli:';
export const UNKNOWN_AGENT_CODE = 'unknown';

// Agent codes come from `AGENT_SHORT_CODES` in `@elastic/agent-env` and are intentionally
// not enumerated so new codes are counted without a Kibana change. The header is
// client-controlled, so only the shape is validated to bound counter cardinality.
const AGENT_CODE_PATTERN = /^[a-z0-9-]{1,16}$/;

const getHeaderValues = (request: KibanaRequest, name: string): string[] =>
  [request.headers[name] ?? ''].flat();

/**
 * Returns the agent harness code (`ag=<code>` in `x-elastic-client-meta`) for requests
 * sent by the Elastic CLI, or undefined when the request is not an agent-driven CLI request.
 */
export const getElasticCliAgentCode = (request: KibanaRequest): string | undefined => {
  const isElasticCli = getHeaderValues(request, 'user-agent').some((value) =>
    value.toLowerCase().startsWith(ELASTIC_CLI_USER_AGENT_PREFIX)
  );
  if (!isElasticCli) {
    return;
  }

  const agentEntry = getHeaderValues(request, ELASTIC_CLIENT_META_HEADER)
    .flatMap((value) => value.split(','))
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith('ag='));
  const agentCode = agentEntry?.slice('ag='.length).toLowerCase();
  if (!agentCode) {
    return;
  }

  return AGENT_CODE_PATTERN.test(agentCode) ? agentCode : UNKNOWN_AGENT_CODE;
};

/**
 * Wraps a route handler with API usage telemetry. Skips counting for
 * Kibana-internal requests (x-elastic-internal-origin: kibana) and routes
 * without a registered routePath.
 *
 * @param request - The incoming Kibana request.
 * @param options - Telemetry options.
 * @param options.usageCounter - Counter to increment on each tracked request.
 * @param options.trackAgentic - When true, requests from the Elastic CLI that carry an
 *   agent harness code (see {@link getElasticCliAgentCode}) also increment the counter
 *   with `counterType: AGENTIC_COUNTER_TYPE` and `counterType: 'elastic-cli:<code>'`.
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

    const agentCode = trackAgentic ? getElasticCliAgentCode(request) : undefined;
    if (agentCode) {
      usageCounter.incrementCounter({ counterName, counterType: AGENTIC_COUNTER_TYPE });
      usageCounter.incrementCounter({
        counterName,
        counterType: `${ELASTIC_CLI_COUNTER_TYPE_PREFIX}${agentCode}`,
      });
    }
  }

  return handlerResponse;
}
