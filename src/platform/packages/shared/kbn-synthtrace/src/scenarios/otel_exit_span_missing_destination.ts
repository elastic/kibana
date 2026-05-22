/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Generates a distributed trace to test the SpanMissingDestinationTooltip in the unified waterfall.
 *
 * Service A is an OTel service (agentName: 'opentelemetry/nodejs') that makes exit spans.
 * Service B is a regular APM service downstream, producing real transaction documents.
 *
 * Cases covered:
 *  - OTel exit span WITHOUT span.destination.service.resource + downstream APM transaction
 *    → missingDestination flag set, warning tooltip expected (happy path)
 *  - OTel exit span WITH span.destination.service.resource + downstream APM transaction
 *    → no flag, no tooltip (edge case)
 */

import type { ApmFields } from '@kbn/synthtrace-client';
import { apm, httpExitSpan } from '@kbn/synthtrace-client';
import type { Scenario } from '../cli/scenario';
import { withClient } from '../lib/utils/with_client';
import { getSynthtraceEnvironment } from '../lib/utils/get_synthtrace_environment';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);

const scenario: Scenario<ApmFields> = async (runOptions) => {
  return {
    generate: ({ range, clients: { apmEsClient } }) => {
      const { logger } = runOptions;

      // Service A: OTel agent (simulates a processed OTel service with agent.name set)
      const serviceA = apm
        .service({
          name: 'otel-service-a-synth',
          environment: ENVIRONMENT,
          agentName: 'opentelemetry/nodejs',
        })
        .instance('instance-a');

      // Service B: regular APM service (produces transaction documents)
      const serviceB = apm
        .service({ name: 'apm-service-b-synth', environment: ENVIRONMENT, agentName: 'nodejs' })
        .instance('instance-b');

      const timestamps = range.interval('1m').rate(1);

      // Happy path: OTel exit span missing span.destination.service.resource + downstream transaction
      // → missingDestination flag set, warning tooltip shown
      const missingDestination = timestamps.generator((timestamp) =>
        serviceA
          .transaction({ transactionName: 'GET /api/products' })
          .timestamp(timestamp)
          .duration(1000)
          .success()
          .children(
            serviceA
              .span({ spanName: 'call-service-b', spanType: 'external', spanSubtype: 'http' })
              .timestamp(timestamp)
              .duration(800)
              .success()
              .children(
                serviceB
                  .transaction({ transactionName: 'GET /api/downstream' })
                  .timestamp(timestamp)
                  .duration(600)
                  .success()
              )
          )
      );

      // Edge case: OTel exit span WITH span.destination.service.resource → no tooltip
      const withDestination = timestamps.generator((timestamp) =>
        serviceA
          .transaction({ transactionName: 'GET /api/orders' })
          .timestamp(timestamp)
          .duration(1000)
          .success()
          .children(
            serviceA
              .span(
                httpExitSpan({
                  spanName: 'GET /api/downstream-with-destination',
                  destinationUrl: 'http://apm-service-b-synth:3000',
                })
              )
              .timestamp(timestamp)
              .duration(500)
              .success()
              .children(
                serviceB
                  .transaction({ transactionName: 'GET /api/downstream-with-destination' })
                  .timestamp(timestamp)
                  .duration(400)
                  .success()
              )
          )
      );

      return withClient(
        apmEsClient,
        logger.perf('generating_otel_missing_destination', () => [
          missingDestination,
          withDestination,
        ])
      );
    },
  };
};

export default scenario;
