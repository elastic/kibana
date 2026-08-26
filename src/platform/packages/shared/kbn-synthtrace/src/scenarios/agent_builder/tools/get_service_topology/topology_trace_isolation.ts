/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * SCENARIO: Service Topology — Trace Isolation
 *
 * Tests that topology queries respect trace boundaries when an instrumented
 * intermediate service is shared across separate traces.
 *
 * Topology:
 *   Trace 1: api-gateway → payment-service → kafka-consumer → postgres
 *   Trace 2: batch-worker → kafka-consumer → redis
 *
 * kafka-consumer appears in both traces but with different downstream deps.
 * Querying api-gateway downstream should show kafka-consumer → postgres
 * but NOT kafka-consumer → redis (which belongs to batch-worker's trace).
 *
 * Validate via:
 *
 * ```
 * POST kbn:///api/agent_builder/tools/_execute
 * {
 *   "tool_id": "observability.get_service_topology",
 *   "tool_params": {
 *     "start": "now-1h",
 *     "end": "now",
 *     "serviceName": "api-gateway"
 *   }
 * }
 * ```
 */

import type { ApmFields, Timerange } from '@kbn/synthtrace-client';
import { apm } from '@kbn/synthtrace-client';
import { createCliScenario } from '../../../../lib/utils/create_scenario';
import { withClient, type ScenarioReturnType } from '../../../../lib/utils/with_client';
import type { ApmSynthtraceEsClient } from '../../../../lib/apm/client/apm_synthtrace_es_client';

export const API_GATEWAY_SERVICE = {
  serviceName: 'api-gateway',
} as const;

export const PAYMENT_SERVICE = {
  serviceName: 'payment-service',
  resource: 'payment-lb:3000',
} as const;

export const KAFKA_CONSUMER_SERVICE = {
  serviceName: 'kafka-consumer',
  resource: 'kafka-broker:9092',
} as const;

export const BATCH_WORKER_SERVICE = {
  serviceName: 'batch-worker',
} as const;

export const POSTGRES_DB = {
  resource: 'postgres:5432',
  spanType: 'db',
  spanSubtype: 'postgresql',
} as const;

export const REDIS_DB = {
  resource: 'redis:6379',
  spanType: 'db',
  spanSubtype: 'redis',
} as const;

export function generateTraceIsolationData({
  range,
  apmEsClient,
}: {
  range: Timerange;
  apmEsClient: ApmSynthtraceEsClient;
}): ScenarioReturnType<ApmFields> {
  const apiGateway = apm
    .service(API_GATEWAY_SERVICE.serviceName, 'production', 'nodejs')
    .instance('api-gw-01');
  const paymentService = apm
    .service(PAYMENT_SERVICE.serviceName, 'production', 'java')
    .instance('payment-01');
  const kafkaConsumer = apm
    .service(KAFKA_CONSUMER_SERVICE.serviceName, 'production', 'go')
    .instance('kafka-consumer-01');
  const batchWorker = apm
    .service(BATCH_WORKER_SERVICE.serviceName, 'production', 'python')
    .instance('batch-worker-01');

  const data = range
    .interval('1m')
    .rate(1)
    .generator((timestamp) => {
      // Trace 1: api-gateway → payment-service → kafka-consumer → postgres
      const trace1 = apiGateway
        .transaction('POST /checkout', 'request')
        .timestamp(timestamp)
        .duration(500)
        .success()
        .children(
          apiGateway
            .span('POST /api/payment', 'external', 'http')
            .destination(PAYMENT_SERVICE.resource)
            .timestamp(timestamp + 10)
            .duration(400)
            .success()
            .children(
              paymentService
                .transaction('POST /api/payment', 'request')
                .timestamp(timestamp + 15)
                .duration(350)
                .success()
                .children(
                  paymentService
                    .span('publish order.created', 'messaging', 'kafka')
                    .destination(KAFKA_CONSUMER_SERVICE.resource)
                    .timestamp(timestamp + 20)
                    .duration(200)
                    .success()
                    .children(
                      kafkaConsumer
                        .transaction('consume order.created', 'messaging')
                        .timestamp(timestamp + 25)
                        .duration(150)
                        .success()
                        .children(
                          kafkaConsumer
                            .span(
                              'INSERT INTO orders',
                              POSTGRES_DB.spanType,
                              POSTGRES_DB.spanSubtype
                            )
                            .destination(POSTGRES_DB.resource)
                            .timestamp(timestamp + 30)
                            .duration(50)
                            .success()
                        )
                    )
                )
            )
        );

      // Trace 2 (separate): batch-worker → kafka-consumer → redis
      const trace2 = batchWorker
        .transaction('process cleanup', 'scheduled')
        .timestamp(timestamp + 600)
        .duration(300)
        .success()
        .children(
          batchWorker
            .span('publish cleanup.batch', 'messaging', 'kafka')
            .destination(KAFKA_CONSUMER_SERVICE.resource)
            .timestamp(timestamp + 610)
            .duration(200)
            .success()
            .children(
              kafkaConsumer
                .transaction('consume cleanup.batch', 'messaging')
                .timestamp(timestamp + 615)
                .duration(150)
                .success()
                .children(
                  kafkaConsumer
                    .span('DEL cache:*', REDIS_DB.spanType, REDIS_DB.spanSubtype)
                    .destination(REDIS_DB.resource)
                    .timestamp(timestamp + 620)
                    .duration(30)
                    .success()
                )
            )
        );

      return [trace1, trace2];
    });

  return withClient(apmEsClient, data);
}

export default createCliScenario(({ range, clients: { apmEsClient } }) => {
  return generateTraceIsolationData({ range, apmEsClient });
});
