/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Generates traces with spans targeting multiple Kafka topics to test service map grouping.

import { Readable } from 'stream';
import type { ApmFields, Serializable } from '@kbn/synthtrace-client';
import { apm } from '@kbn/synthtrace-client';
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

      const timestamps = range.ratePerMinute(6);

      // Generate producer events FIRST to get Kafka span IDs for inbound span.links
      const producerEvents = timestamps.generator((timestamp) =>
        producerService
          .transaction({ transactionName: 'POST /publish' })
          .timestamp(timestamp)
          .duration(200)
          .success()
          .children(
            // Publish to orders topic
            producerService
              .span({
                spanName: 'Publish to kafka/orders',
                spanType: 'messaging',
                spanSubtype: 'kafka',
                'service.target.type': 'kafka',
                'service.target.name': 'orders',
                'span.destination.service.resource': 'kafka/orders',
              })
              .duration(30)
              .success()
              .timestamp(timestamp + 10),

            // Publish to payments topic
            producerService
              .span({
                spanName: 'Publish to kafka/payments',
                spanType: 'messaging',
                spanSubtype: 'kafka',
                'service.target.type': 'kafka',
                'service.target.name': 'payments',
                'span.destination.service.resource': 'kafka/payments',
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
              .timestamp(timestamp + 170),

            // Publish to logs topic
            producerService
              .span({
                spanName: 'Publish to kafka/logs',
                spanType: 'messaging',
                spanSubtype: 'kafka',
                'service.target.type': 'kafka',
                'service.target.name': 'logs',
                'span.destination.service.resource': 'kafka/logs',
              })
              .duration(30)
              .success()
              .timestamp(timestamp + 210)
          )
      );

      // Serialize producer events to get Kafka span IDs
      const serializedProducerEvents = Array.from(producerEvents).flatMap((event) =>
        event.serialize()
      );

      // Find the specific Kafka spans we want to link to
      const ordersKafkaSpan = serializedProducerEvents.find(
        (event) =>
          event['processor.event'] === 'span' && event['span.name'] === 'Publish to kafka/orders'
      );

      const paymentsKafkaSpan = serializedProducerEvents.find(
        (event) =>
          event['processor.event'] === 'span' && event['span.name'] === 'Publish to kafka/payments'
      );

      // Create span.links from Kafka spans to consumer transactions (inbound links)
      const ordersKafkaSpanLink =
        ordersKafkaSpan && ordersKafkaSpan['span.id']
          ? [
              {
                trace: { id: ordersKafkaSpan['trace.id']! },
                span: { id: ordersKafkaSpan['span.id']! },
              },
            ]
          : [];

      const paymentsKafkaSpanLink =
        paymentsKafkaSpan && paymentsKafkaSpan['span.id']
          ? [
              {
                trace: { id: paymentsKafkaSpan['trace.id']! },
                span: { id: paymentsKafkaSpan['span.id']! },
              },
            ]
          : [];

      // Create unserialized producer events
      const unserializedProducerEvents = serializedProducerEvents.map((event) => ({
        fields: event,
        serialize: () => [event],
      })) as Array<Serializable<ApmFields>>;

      // NOW generate consumer transactions with inbound span.links to producer Kafka spans
      const orderProcessorEvents = timestamps.generator((timestamp) =>
        orderProcessorService
          .transaction({ transactionName: 'Process Order from Kafka' })
          .timestamp(timestamp + 300)
          .duration(120)
          .defaults({
            'span.links': ordersKafkaSpanLink,
          })
          .success()
          .children(
            orderProcessorService
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
              .timestamp(timestamp + 305)
          )
      );

      const paymentProcessorEvents = timestamps.generator((timestamp) =>
        paymentProcessorService
          .transaction({ transactionName: 'Process Payment from Kafka' })
          .timestamp(timestamp + 350)
          .duration(100)
          .defaults({
            'span.links': paymentsKafkaSpanLink,
          })
          .success()
          .children(
            paymentProcessorService
              .span({
                spanName: 'Receive from kafka/payments',
                spanType: 'messaging',
                spanSubtype: 'kafka',
                'service.target.type': 'kafka',
                'service.target.name': 'payments',
                'span.destination.service.resource': 'kafka/payments',
              })
              .duration(20)
              .success()
              .timestamp(timestamp + 355)
          )
      );

      const serializedOrderProcessorEvents = Array.from(orderProcessorEvents).flatMap((event) =>
        event.serialize()
      );

      const serializedPaymentProcessorEvents = Array.from(paymentProcessorEvents).flatMap((event) =>
        event.serialize()
      );

      // Create unserialized wrappers for consumer events
      const unserializedOrderProcessorEvents = serializedOrderProcessorEvents.map((event) => ({
        fields: event,
        serialize: () => [event],
      })) as Array<Serializable<ApmFields>>;

      const unserializedPaymentProcessorEvents = serializedPaymentProcessorEvents.map((event) => ({
        fields: event,
        serialize: () => [event],
      })) as Array<Serializable<ApmFields>>;

      // Generate other service events
      const otherEvents = timestamps.generator((timestamp) => [
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

        // Kafka consumer service that reads from orders topic
        consumerService
          .transaction({ transactionName: 'consume kafka/orders' })
          .timestamp(timestamp + 500)
          .duration(150)
          .success()
          .children(
            // Read from orders topic
            consumerService
              .span({
                spanName: 'Consume from kafka/orders',
                spanType: 'messaging',
                spanSubtype: 'kafka',
                'service.target.type': 'kafka',
                'service.target.name': 'orders',
                'span.destination.service.resource': 'kafka/orders',
              })
              .duration(20)
              .success()
              .timestamp(timestamp + 510),

            // Process the message
            consumerService
              .span({
                spanName: 'Process order',
                spanType: 'app',
                spanSubtype: 'internal',
              })
              .duration(100)
              .success()
              .timestamp(timestamp + 540)
          ),
      ]);

      const serializedOtherEvents = Array.from(otherEvents).flatMap((event) => event.serialize());

      const unserializedOtherEvents = serializedOtherEvents.map((event) => ({
        fields: event,
        serialize: () => [event],
      })) as Array<Serializable<ApmFields>>;

      return withClient(
        apmEsClient,
        Readable.from([
          ...unserializedProducerEvents,
          ...unserializedOrderProcessorEvents,
          ...unserializedPaymentProcessorEvents,
          ...unserializedOtherEvents,
        ])
      );
    },
  };
};

export default scenario;
