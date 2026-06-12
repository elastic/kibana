/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { performance } from 'perf_hooks';
import { Client, HttpConnection, ClusterConnectionPool } from '@elastic/elasticsearch';
import type { Logger } from '@kbn/logging';
import type { ElasticsearchClientConfig } from '@kbn/core-elasticsearch-server';
import { metrics, ValueType } from '@opentelemetry/api';
import { parseClientOptions } from './client_config';
import { instrumentEsQueryAndDeprecationLogger } from './log_query_and_deprecation';
import { createTransport, type OnRequestHandler } from './create_transport';
import type { AgentFactoryProvider } from './agent_manager';
import { patchElasticsearchClient } from './patch_client';

const noop = () => undefined;

// Apply ES client patches on module load
patchElasticsearchClient();

export const configureClient = (
  config: ElasticsearchClientConfig,
  {
    logger,
    type,
    scoped = false,
    getExecutionContext = noop,
    agentFactoryProvider,
    kibanaVersion,
    onRequest,
  }: {
    logger: Logger;
    type: string;
    scoped?: boolean;
    getExecutionContext?: () => string | undefined;
    agentFactoryProvider: AgentFactoryProvider;
    kibanaVersion: string;
    onRequest: OnRequestHandler;
  }
): Client => {
  const clientOptions = parseClientOptions(config, scoped, kibanaVersion);
  const KibanaTransport = createTransport({ scoped, getExecutionContext, onRequest, logger });
  const client = new Client({
    ...clientOptions,
    agent: agentFactoryProvider.getAgentFactory(clientOptions.agent),
    Transport: KibanaTransport,
    Connection: HttpConnection,
    // using ClusterConnectionPool until https://github.com/elastic/elasticsearch-js/issues/1714 is addressed
    ConnectionPool: ClusterConnectionPool,
  });

  const { apisToRedactInLogs = [] } = config;
  instrumentEsQueryAndDeprecationLogger({ logger, client, type, apisToRedactInLogs });

  instrumentCpsMetrics({ client, logger: logger.get('cps') });

  return client;
};

/**
 * Instruments CPS metrics with HTTP response status.
 *
 * Emits a single unified metric after response returns so we can include http_status dimension.
 * The metric includes bypass_reason when applicable, and projectId/region are automatically
 * added to resource.attributes by the OpenTelemetry SDK.
 */
function instrumentCpsMetrics({ client, logger }: { client: Client; logger: Logger }) {
  const meter = metrics.getMeter('kibana.elasticsearch.cps');
  const cpsRequestCounter = meter.createCounter('kibana.elasticsearch.cps.request.count', {
    description:
      'Unified count of Elasticsearch CPS requests with routing type, status, and bypass reason',
    unit: '{request}',
    valueType: ValueType.INT,
  });

  client.diagnostic.on('response', (error, event) => {
    if (!event) return;

    const routingContext = (event.meta.request.options?.context as any)?.cpsRoutingContext;
    if (!routingContext) return; // Not a CPS-instrumented request

    const {
      routingType,
      routingAccepted,
      cpsEnabled,
      apiName,
      bypassReason,
      requestId,
      routePath,
      requestPath,
    } = routingContext;
    const httpStatus = error ? getErrorStatus(error) : event.statusCode ?? 200;

    const metricAttributes: Record<string, string | number | boolean> = {
      'kibana.cps.enabled': cpsEnabled,
      'kibana.cps.routing.type': routingType,
      'kibana.cps.routing.accepted': routingAccepted,
      'db.operation.name': apiName,
      'http.response.status_code': httpStatus,
    };

    if (routingType === 'none' && bypassReason) {
      metricAttributes['kibana.cps.routing.bypass_reason'] = bypassReason;
    }

    cpsRequestCounter.add(1, metricAttributes);

    // Report ES request timing to Server-Timing header
    const timingContext = (event.meta.request.options?.context as any)?.timingContext;
    if (timingContext?.kibanaRequest?.serverTiming && timingContext.startTime) {
      const duration = performance.now() - timingContext.startTime;
      const method = event.meta.request.params.method || 'unknown';
      const path = event.meta.request.params.path || 'unknown';

      timingContext.kibanaRequest.serverTiming.measure('es-request', duration, `${method} ${path}`);
    }

    logger.debug('CPS request completed', {
      event: {
        kind: routingType === 'none' && bypassReason ? 'alert' : 'metric',
        category: ['web', 'api'],
      },
      cps: {
        routing_type: routingType,
        api_name: apiName,
        is_cps_enabled: cpsEnabled,
        bypass_reason: bypassReason ?? null,
        request_id: requestId,
        route_path: routePath,
        request_path: requestPath,
      },
      http: {
        request: {
          method: event.meta.request.params?.method ?? 'unknown',
        },
        response: {
          status_code: httpStatus,
        },
      },
    } as any);
  });
}

function getErrorStatus(error: any): number {
  return error?.statusCode ?? error?.meta?.statusCode ?? 500;
}
