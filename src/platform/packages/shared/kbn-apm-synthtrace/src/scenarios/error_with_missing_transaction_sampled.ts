/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Generates APM errors linked to transactions that are missing `transaction.sampled`.
 * This simulates the scenario described in https://github.com/elastic/kibana/issues/254262
 * where OTel, RUM, or older agents may not populate `transaction.sampled`, causing
 * the error group details page to fail with a 500 error.
 *
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
      const instance = apm
        .service({
          name: 'otel-service-without-sampled',
          environment: ENVIRONMENT,
          agentName: 'opentelemetry/nodejs',
        })
        .instance('otel-instance');

      const events = range.interval('1m').generator((timestamp) => {
        const error = instance
          .error({
            message: `PageFatalReactError: Cannot read properties of undefined`,
            type: 'PageFatalReactError',
          })
          .timestamp(timestamp);

        const transaction = instance
          .transaction({ transactionName: 'GET /api/products' })
          .timestamp(timestamp)
          .duration(1500)
          .failure()
          .errors(error);

        // Strip `transaction.sampled` from both the transaction and its error
        // to simulate OTel/RUM agents that don't populate this field.
        delete (transaction.fields as Record<string, unknown>)['transaction.sampled'];
        delete (error.fields as Record<string, unknown>)['transaction.sampled'];

        return transaction;
      });

      // Also generate a normal service with sampled transactions for comparison
      const normalInstance = apm
        .service({
          name: 'normal-java-service',
          environment: ENVIRONMENT,
          agentName: 'java',
        })
        .instance('java-instance');

      const normalEvents = range.interval('1m').generator((timestamp) => {
        return normalInstance
          .transaction({ transactionName: 'POST /api/orders' })
          .timestamp(timestamp)
          .duration(800)
          .failure()
          .errors(
            normalInstance
              .error({ message: 'NullPointerException: null', type: 'NullPointerException' })
              .timestamp(timestamp)
          );
      });

      return [withClient(apmEsClient, events), withClient(apmEsClient, normalEvents)];
    },
  };
};

export default scenario;
