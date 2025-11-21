/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Mixed Messaging Systems Scenario
 *
 * This scenario creates multiple services producing to different messaging systems
 * to test service map grouping behavior with Kafka, RabbitMQ, and SQS.
 *
 * Test cases covered:
 * 1. kafka-producer → 5 Kafka topics (should group if messaging allowed)
 * 2. multi-messaging → 2 Kafka + 2 RabbitMQ + 2 SQS (tests mixed grouping)
 * 3. rabbitmq-producer → 4 RabbitMQ queues (should group if messaging allowed)
 *
 * Run: node scripts/synthtrace messaging_systems_mixed.ts --clean
 * Then check APM → Service Map
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
      const kafkaProducerService = apm
        .service({ name: 'kafka-producer', environment: ENVIRONMENT, agentName: 'nodejs' })
        .instance('kafka-producer-instance');

      const multiMessagingService = apm
        .service({ name: 'multi-messaging', environment: ENVIRONMENT, agentName: 'java' })
        .instance('multi-messaging-instance');

      const rabbitmqProducerService = apm
        .service({ name: 'rabbitmq-producer', environment: ENVIRONMENT, agentName: 'python' })
        .instance('rabbitmq-producer-instance');

      const successfulTimestamps = range.ratePerMinute(6);

      return withClient(
        apmEsClient,
        successfulTimestamps.generator((timestamp) => {
          return [
            // Scenario 1: kafka-producer → 5 Kafka topics
            kafkaProducerService
              .transaction({ transactionName: 'POST /produce/kafka' })
              .timestamp(timestamp)
              .duration(300)
              .success()
              .children(
                kafkaProducerService
                  .span({
                    spanName: 'Produce kafka/orders',
                    spanType: 'messaging',
                    spanSubtype: 'kafka',
                    'service.target.type': 'kafka',
                    'service.target.name': 'orders',
                    'span.destination.service.resource': 'kafka/orders',
                  })
                  .duration(40)
                  .success()
                  .timestamp(timestamp + 10),

                kafkaProducerService
                  .span({
                    spanName: 'Produce kafka/payments',
                    spanType: 'messaging',
                    spanSubtype: 'kafka',
                    'service.target.type': 'kafka',
                    'service.target.name': 'payments',
                    'span.destination.service.resource': 'kafka/payments',
                  })
                  .duration(40)
                  .success()
                  .timestamp(timestamp + 60),

                kafkaProducerService
                  .span({
                    spanName: 'Produce kafka/inventory',
                    spanType: 'messaging',
                    spanSubtype: 'kafka',
                    'service.target.type': 'kafka',
                    'service.target.name': 'inventory',
                    'span.destination.service.resource': 'kafka/inventory',
                  })
                  .duration(40)
                  .success()
                  .timestamp(timestamp + 110),

                kafkaProducerService
                  .span({
                    spanName: 'Produce kafka/notifications',
                    spanType: 'messaging',
                    spanSubtype: 'kafka',
                    'service.target.type': 'kafka',
                    'service.target.name': 'notifications',
                    'span.destination.service.resource': 'kafka/notifications',
                  })
                  .duration(40)
                  .success()
                  .timestamp(timestamp + 160),

                kafkaProducerService
                  .span({
                    spanName: 'Produce kafka/analytics',
                    spanType: 'messaging',
                    spanSubtype: 'kafka',
                    'service.target.type': 'kafka',
                    'service.target.name': 'analytics',
                    'span.destination.service.resource': 'kafka/analytics',
                  })
                  .duration(40)
                  .success()
                  .timestamp(timestamp + 210)
              ),

            // Scenario 2: multi-messaging → 2 Kafka + 2 RabbitMQ + 2 SQS (mixed)
            multiMessagingService
              .transaction({ transactionName: 'POST /produce/mixed' })
              .timestamp(timestamp)
              .duration(400)
              .success()
              .children(
                // Kafka
                multiMessagingService
                  .span({
                    spanName: 'Produce kafka/events',
                    spanType: 'messaging',
                    spanSubtype: 'kafka',
                    'service.target.type': 'kafka',
                    'service.target.name': 'events',
                    'span.destination.service.resource': 'kafka/events',
                  })
                  .duration(40)
                  .success()
                  .timestamp(timestamp + 10),

                multiMessagingService
                  .span({
                    spanName: 'Produce kafka/metrics',
                    spanType: 'messaging',
                    spanSubtype: 'kafka',
                    'service.target.type': 'kafka',
                    'service.target.name': 'metrics',
                    'span.destination.service.resource': 'kafka/metrics',
                  })
                  .duration(40)
                  .success()
                  .timestamp(timestamp + 60),

                // RabbitMQ
                multiMessagingService
                  .span({
                    spanName: 'Publish rabbitmq/tasks',
                    spanType: 'messaging',
                    spanSubtype: 'rabbitmq',
                    'service.target.type': 'rabbitmq',
                    'service.target.name': 'tasks',
                    'span.destination.service.resource': 'rabbitmq/tasks',
                  })
                  .duration(30)
                  .success()
                  .timestamp(timestamp + 110),

                multiMessagingService
                  .span({
                    spanName: 'Publish rabbitmq/emails',
                    spanType: 'messaging',
                    spanSubtype: 'rabbitmq',
                    'service.target.type': 'rabbitmq',
                    'service.target.name': 'emails',
                    'span.destination.service.resource': 'rabbitmq/emails',
                  })
                  .duration(30)
                  .success()
                  .timestamp(timestamp + 150),

                // SQS
                multiMessagingService
                  .span({
                    spanName: 'Send sqs/alerts',
                    spanType: 'messaging',
                    spanSubtype: 'sqs',
                    'service.target.type': 'sqs',
                    'service.target.name': 'alerts',
                    'span.destination.service.resource': 'sqs/alerts',
                  })
                  .duration(50)
                  .success()
                  .timestamp(timestamp + 190),

                multiMessagingService
                  .span({
                    spanName: 'Send sqs/logs',
                    spanType: 'messaging',
                    spanSubtype: 'sqs',
                    'service.target.type': 'sqs',
                    'service.target.name': 'logs',
                    'span.destination.service.resource': 'sqs/logs',
                  })
                  .duration(50)
                  .success()
                  .timestamp(timestamp + 250)
              ),

            // Scenario 3: rabbitmq-producer → 4 RabbitMQ queues
            rabbitmqProducerService
              .transaction({ transactionName: 'POST /produce/rabbitmq' })
              .timestamp(timestamp)
              .duration(250)
              .success()
              .children(
                rabbitmqProducerService
                  .span({
                    spanName: 'Publish rabbitmq/orders',
                    spanType: 'messaging',
                    spanSubtype: 'rabbitmq',
                    'service.target.type': 'rabbitmq',
                    'service.target.name': 'orders',
                    'span.destination.service.resource': 'rabbitmq/orders',
                  })
                  .duration(30)
                  .success()
                  .timestamp(timestamp + 10),

                rabbitmqProducerService
                  .span({
                    spanName: 'Publish rabbitmq/shipping',
                    spanType: 'messaging',
                    spanSubtype: 'rabbitmq',
                    'service.target.type': 'rabbitmq',
                    'service.target.name': 'shipping',
                    'span.destination.service.resource': 'rabbitmq/shipping',
                  })
                  .duration(30)
                  .success()
                  .timestamp(timestamp + 50),

                rabbitmqProducerService
                  .span({
                    spanName: 'Publish rabbitmq/returns',
                    spanType: 'messaging',
                    spanSubtype: 'rabbitmq',
                    'service.target.type': 'rabbitmq',
                    'service.target.name': 'returns',
                    'span.destination.service.resource': 'rabbitmq/returns',
                  })
                  .duration(30)
                  .success()
                  .timestamp(timestamp + 90),

                rabbitmqProducerService
                  .span({
                    spanName: 'Publish rabbitmq/inventory',
                    spanType: 'messaging',
                    spanSubtype: 'rabbitmq',
                    'service.target.type': 'rabbitmq',
                    'service.target.name': 'inventory',
                    'span.destination.service.resource': 'rabbitmq/inventory',
                  })
                  .duration(30)
                  .success()
                  .timestamp(timestamp + 130)
              ),
          ];
        })
      );
    },
  };
};

export default scenario;
