/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Generates a distributed trace with a missing span destination to diagnose service map issues.
 */

import type { ApmFields, Serializable } from '@kbn/synthtrace-client';
import { apm, httpExitSpan } from '@kbn/synthtrace-client';
import { Readable } from 'stream';
import type { Scenario } from '../cli/scenario';
import type { RunOptions } from '../cli/utils/parse_run_cli_flags';
import { getSynthtraceEnvironment } from '../lib/utils/get_synthtrace_environment';
import { withClient } from '../lib/utils/with_client';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);

const scenario: Scenario<ApmFields> = async (runOptions: RunOptions) => {
  return {
    generate: ({ range, clients: { apmEsClient } }) => {
      const successfulTimestamps = range.interval('15m').rate(1);

      const web = apm
        .service({ name: 'web', environment: ENVIRONMENT, agentName: 'rum-js' })
        .instance('my-instance');
      const proxy = apm
        .service({ name: 'frontend-proxy', environment: ENVIRONMENT, agentName: 'nodejs' })
        .instance('my-instance');
      const backend = apm
        .service({ name: 'backend', environment: ENVIRONMENT, agentName: 'go' })
        .instance('my-instance');

      const payment = apm
        .service({ name: 'payment-service', environment: ENVIRONMENT, agentName: 'go' })
        .instance('my-instance');

      const traces = successfulTimestamps.generator((timestamp) => {
        // web
        return web
          .transaction({ transactionName: 'Initial transaction in web' })
          .duration(400)
          .timestamp(timestamp)
          .children(
            // web -> proxy
            web
              .span(
                httpExitSpan({
                  spanName: 'Missing span.destination.service.resource',
                  destinationUrl: 'http://proxy:3000',
                })
              )
              .duration(300)
              .timestamp(timestamp + 10)
              .children(
                // frontend
                proxy
                  .transaction({ transactionName: 'Initial transaction in proxy' })
                  .duration(300)
                  .timestamp(timestamp + 20)
              ),

            web
              .span(
                httpExitSpan({
                  spanName: 'GET /backend/api/products/top',
                  destinationUrl: 'http://backend:3000',
                })
              )
              .duration(300)
              .timestamp(timestamp + 10)
              .children(
                // backend
                backend
                  .transaction({ transactionName: 'Initial transaction in backend' })
                  .duration(300)
                  .timestamp(timestamp + 20)
                  .children(
                    backend
                      .span(
                        httpExitSpan({
                          spanName: 'GET /payment',
                          destinationUrl: 'http://payment:3000',
                        })
                      )
                      .timestamp(timestamp + 30)
                      .duration(300)
                      .children(
                        // payment
                        payment
                          .transaction({ transactionName: 'Initial transaction in payment' })
                          .timestamp(timestamp + 40)
                          .duration(200)
                          .children(
                            payment
                              .span({ spanName: 'execute_payment', spanType: 'custom' })
                              .timestamp(timestamp + 50)
                              .duration(100)
                              .success()
                          )
                      )
                  )
              )
          );
      });

      const unserialized = Array.from(traces);

      const serialized = unserialized
        .flatMap((event) => event.serialize())
        .filter((event) => event['transaction.name'] !== 'Initial transaction in payment')
        .map((event) => {
          if (event['span.destination.service.resource'] === 'proxy:3000') {
            delete event['span.destination.service.resource'];
          }
          return event;
        });

      const unserializedChanged = serialized.map((event) => ({
        fields: event,
        serialize: () => {
          return [event];
        },
      })) as Array<Serializable<ApmFields>>;

      return withClient(apmEsClient, Readable.from([...unserializedChanged]));
    },
  };
};

export default scenario;
