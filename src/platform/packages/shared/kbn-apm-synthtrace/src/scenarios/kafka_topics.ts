/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Generates traces with spans targeting multiple Kafka topics to test service map grouping.
 * This scenario demonstrates the issue where multiple Kafka topics (kafka/orders, kafka/payments, etc.)
 * are not collapsed into a single "kafka" node in the service map.
 *
 * To reproduce issue #241608:
 * 1. Run this scenario: node scripts/synthtrace kafka_topics.ts --clean
 * 2. Navigate to APM → Service Map
 * 3. Observe that each Kafka topic appears as a separate node instead of being grouped
 *
 * Expected behavior after fix:
 * - All Kafka topics should collapse into a single "kafka" grouped node when there are 4+ topics
 * - The grouped node should show connections to downstream consumer services via span.links
 */

import type { ApmFields } from '@kbn/apm-synthtrace-client';
import { apm } from '@kbn/apm-synthtrace-client';
import type { Scenario } from '../cli/scenario';
import { getSynthtraceEnvironment } from '../lib/utils/get_synthtrace_environment';
import { withClient } from '../lib/utils/with_client';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);

const scenario: Scenario<ApmFields> = async () => {
  return {
    generate: ({ range, clients: { apmEsClient } }) => {
      const producerService = apm
        .service({ name: 'kafka-producer', environment: ENVIRONMENT, agentName: 'nodejs' })
        .instance('kafka-producer-instance');

      const consumerService = apm
        .service({ name: 'kafka-consumer', environment: ENVIRONMENT, agentName: 'java' })
        .instance('kafka-consumer-instance');

      const orderProcessorService = apm
        .service({ name: 'order-processor', environment: ENVIRONMENT, agentName: 'java' })
        .instance('order-processor-instance');

      const paymentProcessorService = apm
        .service({ name: 'payment-processor', environment: ENVIRONMENT, agentName: 'java' })
        .instance('payment-processor-instance');

      const apiService = apm
        .service({ name: 'api-service', environment: ENVIRONMENT, agentName: 'nodejs' })
        .instance('api-service-instance');

      const successfulTimestamps = range.ratePerMinute(6);

      return withClient(
        apmEsClient,
        successfulTimestamps.generator((timestamp) => {
          // Generate consumer transactions first to get their IDs for span.links
          const orderProcessorTx = orderProcessorService
            .transaction({ transactionName: 'Process Order from Kafka' })
            .timestamp(timestamp + 300)
            .duration(120)
            .success();

          const paymentProcessorTx = paymentProcessorService
            .transaction({ transactionName: 'Process Payment from Kafka' })
            .timestamp(timestamp + 350)
            .duration(100)
            .success();

          const orderProcessorEvents = orderProcessorTx.serialize();
          const paymentProcessorEvents = paymentProcessorTx.serialize();

          const orderProcessorTraceId = orderProcessorEvents[0]?.['trace.id'];
          const orderProcessorTxId = orderProcessorEvents[0]?.['transaction.id'];
          const paymentProcessorTraceId = paymentProcessorEvents[0]?.['trace.id'];
          const paymentProcessorTxId = paymentProcessorEvents[0]?.['transaction.id'];

          return [
            // API service that calls the producer
            apiService
              .transaction({ transactionName: 'POST /api/events' })
              .timestamp(timestamp)
              .duration(100)
              .success()
              .children(
                apiService
                  .span({
                    spanName: 'Call Producer',
                    spanType: 'external',
                    spanSubtype: 'http',
                  })
                  .destination('kafka-producer:3000')
                  .timestamp(timestamp)
                  .duration(80)
                  .success()
              ),

            // Producer service that publishes to multiple Kafka topics
            producerService
              .transaction({ transactionName: 'POST /publish' })
              .timestamp(timestamp)
              .duration(200)
              .success()
              .children(
                // Publish to orders topic - with span.link to order-processor service
                producerService
                  .span({
                    spanName: 'Publish to kafka/orders',
                    spanType: 'messaging',
                    spanSubtype: 'kafka',
                    'service.target.type': 'kafka',
                    'service.target.name': 'orders',
                    'span.destination.service.resource': 'kafka/orders',
                  })
                  .defaults({
                    'span.links':
                      orderProcessorTraceId && orderProcessorTxId
                        ? [
                            {
                              trace: { id: orderProcessorTraceId },
                              span: { id: orderProcessorTxId },
                            },
                          ]
                        : [],
                  })
                  .duration(30)
                  .success()
                  .timestamp(timestamp + 10),

                // Publish to payments topic - with span.link to payment-processor service
                producerService
                  .span({
                    spanName: 'Publish to kafka/payments',
                    spanType: 'messaging',
                    spanSubtype: 'kafka',
                    'service.target.type': 'kafka',
                    'service.target.name': 'payments',
                    'span.destination.service.resource': 'kafka/payments',
                  })
                  .defaults({
                    'span.links':
                      paymentProcessorTraceId && paymentProcessorTxId
                        ? [
                            {
                              trace: { id: paymentProcessorTraceId },
                              span: { id: paymentProcessorTxId },
                            },
                          ]
                        : [],
                  })
                  .duration(30)
                  .success()
                  .timestamp(timestamp + 50),

                // Publish to notifications topic
                producerService
                  .span({
                    spanName: 'Publish to kafka/notifications',
                    spanType: 'messaging',
                    spanSubtype: 'kafka',
                    'service.target.type': 'kafka',
                    'service.target.name': 'notifications',
                    'span.destination.service.resource': 'kafka/notifications',
                  })
                  .duration(30)
                  .success()
                  .timestamp(timestamp + 90),

                // Publish to analytics topic
                producerService
                  .span({
                    spanName: 'Publish to kafka/analytics',
                    spanType: 'messaging',
                    spanSubtype: 'kafka',
                    'service.target.type': 'kafka',
                    'service.target.name': 'analytics',
                    'span.destination.service.resource': 'kafka/analytics',
                  })
                  .duration(30)
                  .success()
                  .timestamp(timestamp + 130),

                // Publish to events topic
                producerService
                  .span({
                    spanName: 'Publish to kafka/events',
                    spanType: 'messaging',
                    spanSubtype: 'kafka',
                    'service.target.type': 'kafka',
                    'service.target.name': 'events',
                    'span.destination.service.resource': 'kafka/events',
                  })
                  .duration(30)
                  .success()
                  .timestamp(timestamp + 170)
              ),

            // Consumer service that reads from Kafka topics
            consumerService
              .transaction({ transactionName: 'Process Message' })
              .timestamp(timestamp + 250)
              .duration(150)
              .success()
              .children(
                // Read from orders topic
                consumerService
                  .span({
                    spanName: 'Receive from kafka/orders',
                    spanType: 'messaging',
                    spanSubtype: 'kafka',
                    'service.target.type': 'kafka',
                    'service.target.name': 'orders',
                    'span.destination.service.resource': 'kafka/orders',
                  })
                  .duration(20)
                  .success()
                  .timestamp(timestamp + 260),

                // Process the message
                consumerService
                  .span({
                    spanName: 'Process order',
                    spanType: 'app',
                    spanSubtype: 'internal',
                  })
                  .duration(100)
                  .success()
                  .timestamp(timestamp + 290)
              ),

            // Order processor service consuming from kafka/orders topic
            // This tests the scenario where a grouped Kafka span points to a service
            orderProcessorService
              .transaction({ transactionName: 'Process Order from Kafka' })
              .timestamp(timestamp + 300)
              .duration(120)
              .success(),

            // Payment processor service consuming from kafka/payments topic
            // This tests the scenario where a grouped Kafka span points to a service
            paymentProcessorService
              .transaction({ transactionName: 'Process Payment from Kafka' })
              .timestamp(timestamp + 350)
              .duration(100)
              .success(),
          ];
        })
      );
    },
  };
};

export default scenario;
