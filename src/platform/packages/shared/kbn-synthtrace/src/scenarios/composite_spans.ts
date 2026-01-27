/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Generates traces with composite (compressed) spans.
 * Composite spans represent multiple similar consecutive spans that have been compressed by the APM agent.
 */

import { Readable } from 'stream';
import type { ApmFields } from '@kbn/synthtrace-client';
import { apm, ApmSynthtracePipelineSchema } from '@kbn/synthtrace-client';
import type { Scenario } from '../cli/scenario';
import { getSynthtraceEnvironment } from '../lib/utils/get_synthtrace_environment';
import { withClient } from '../lib/utils/with_client';
import { parseApmScenarioOpts } from './helpers/apm_scenario_ops_parser';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);

const scenario: Scenario<ApmFields> = async ({ logger, scenarioOpts }) => {
  const { pipeline = ApmSynthtracePipelineSchema.Default } = parseApmScenarioOpts(scenarioOpts);

  return {
    generate: ({ range, clients: { apmEsClient } }) => {
      const timestamps = range.ratePerMinute(1);

      const checkoutService = apm
        .service({ name: 'checkout-service', environment: ENVIRONMENT, agentName: 'java' })
        .instance('checkout-1');

      const events = timestamps.generator((timestamp) =>
        checkoutService
          .transaction({ transactionName: 'POST /api/checkout' })
          .timestamp(timestamp)
          .duration(850)
          .success()
          .children(
            // Fetch cart from Redis
            checkoutService
              .span({
                spanName: 'GET cart:user-123',
                spanType: 'db',
                spanSubtype: 'redis',
              })
              .timestamp(timestamp + 5)
              .duration(3)
              .success(),

            // Fetching product details for each of the 8 items in cart
            checkoutService
              .span({
                spanName: 'SELECT * FROM products WHERE id = ?',
                spanType: 'db',
                spanSubtype: 'postgresql',
              })
              .defaults({
                'span.composite.count': 8,
                'span.composite.sum.us': 24000,
                'span.composite.compression_strategy': 'exact_match',
              } as unknown as ApmFields)
              .timestamp(timestamp + 10)
              .duration(35)
              .success(),

            // Check inventory
            checkoutService
              .span({
                spanName: 'SELECT stock FROM inventory WHERE product_id IN (?)',
                spanType: 'db',
                spanSubtype: 'postgresql',
              })
              .timestamp(timestamp + 50)
              .duration(12)
              .success(),

            // Multiple HTTP calls to same service: /validate, /authorize, /capture (same_kind)
            checkoutService
              .span({
                spanName: 'Calls to payments.app.com:443',
                spanType: 'external',
                spanSubtype: 'http',
              })
              .defaults({
                'span.composite.count': 3,
                'span.composite.sum.us': 450000,
                'span.composite.compression_strategy': 'same_kind',
                'span.destination.service.resource': 'payments.app.com:443',
              } as unknown as ApmFields)
              .timestamp(timestamp + 70)
              .duration(520)
              .success(),

            // Update inventory for each item (exact_match)
            checkoutService
              .span({
                spanName: 'UPDATE inventory SET stock = stock - 1 WHERE product_id = ?',
                spanType: 'db',
                spanSubtype: 'postgresql',
              })
              .defaults({
                'span.composite.count': 8,
                'span.composite.sum.us': 16000,
                'span.composite.compression_strategy': 'exact_match',
              } as unknown as ApmFields)
              .timestamp(timestamp + 600)
              .duration(25)
              .success(),

            // Send confirmation email
            checkoutService
              .span({
                spanName: 'POST email-service/send',
                spanType: 'external',
                spanSubtype: 'http',
              })
              .timestamp(timestamp + 630)
              .duration(45)
              .success(),

            // Publish order events to Kafka (exact_match)
            checkoutService
              .span({
                spanName: 'orders topic',
                spanType: 'messaging',
                spanSubtype: 'kafka',
              })
              .defaults({
                'span.composite.count': 4,
                'span.composite.sum.us': 8000,
                'span.composite.compression_strategy': 'exact_match',
              } as unknown as ApmFields)
              .timestamp(timestamp + 680)
              .duration(15)
              .success()
          )
      );

      return withClient(
        apmEsClient,
        logger.perf('generating_composite_spans', () => Readable.from(events))
      );
    },
    setupPipeline: ({ apmEsClient }) =>
      apmEsClient.setPipeline(apmEsClient.resolvePipelineType(pipeline)),
  };
};

export default scenario;
