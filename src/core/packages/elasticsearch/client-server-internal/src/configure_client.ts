/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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

  instrumentCpsMetrics({ client });

  return client;
};

/**
 * Instruments CPS metrics with HTTP response status.
 *
 * Emits metrics after response returns so we can include http_status dimension.
 */
function instrumentCpsMetrics({ client }: { client: Client }) {
  const meter = metrics.getMeter('kibana.elasticsearch.cps');
  const requestCountGlobalCounter = meter.createCounter('kibana.elasticsearch.cps.request.count', {
    description: 'Total count of CPS-eligible Elasticsearch API requests (global aggregations)',
    unit: 'requests',
    valueType: ValueType.INT,
  });

  const requestsByProjectCounter = meter.createCounter(
    'kibana.elasticsearch.cps.requests.by_project',
    {
      description: 'Count of CPS-routed requests per project (for per-project error rate)',
      unit: 'requests',
      valueType: ValueType.INT,
    }
  );

  const adoptionCounter = meter.createCounter('kibana.elasticsearch.cps.adoption', {
    description: 'Count of CPS-routed requests per project and region (for adoption tracking)',
    unit: 'requests',
    valueType: ValueType.INT,
  });

  client.diagnostic.on('response', (error, event) => {
    if (!event) return;

    const routingContext = (event.meta.request.options?.context as any)?.cpsRoutingContext;
    if (!routingContext) return; // Not a CPS-instrumented request

    const { routingType, cpsEnabled, apiName, projectId, region } = routingContext;
    const httpStatus = error ? getErrorStatus(error) : event.statusCode ?? 200;

    // Metric 1: Global aggregations
    requestCountGlobalCounter.add(1, {
      routing_type: routingType,
      api_name: apiName,
      is_cps_enabled: String(cpsEnabled),
      http_status: String(httpStatus),
    });

    // Metric 2: Per-project (only for CPS-routed requests)
    if (routingType === 'injected' || routingType === 'explicit') {
      requestsByProjectCounter.add(1, {
        project_id: projectId,
        http_status: String(httpStatus),
      });

      // Metric 3: Adoption (only for CPS-routed requests)
      adoptionCounter.add(1, {
        project_id: projectId,
        region,
      });
    }
  });
}

function getErrorStatus(error: any): number {
  return error?.statusCode ?? error?.meta?.statusCode ?? 500;
}
