/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint-disable @typescript-eslint/no-shadow */

import { apm, ApmFields, DistributedTrace } from '@kbn/apm-synthtrace-client';
import { Scenario } from '../cli/scenario';
import { RunOptions } from '../cli/utils/parse_run_cli_flags';
import { getSynthtraceEnvironment } from '../lib/utils/get_synthtrace_environment';
import { withClient } from '../lib/utils/with_client';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);

const scenario: Scenario<ApmFields> = async (runOptions: RunOptions) => {
  return {
    generate: ({ range, clients: { apmEsClient } }) => {
      const ratePerMinute = 1;
      const traceDuration = 1100;
      const rootTransactionName = `${ratePerMinute}rpm / ${traceDuration}ms`;

      const synthRum = apm
        .service({ name: 'synth-rum', environment: ENVIRONMENT, agentName: 'rum-js' })
        .instance('my-instance');

      const synthNode = apm
        .service({ name: 'synth-node', environment: ENVIRONMENT, agentName: 'nodejs' })
        .instance('my-instance');

      const synthGo = apm
        .service({ name: 'synth-go', environment: ENVIRONMENT, agentName: 'go' })
        .instance('my-instance');

      const synthDotnet = apm
        .service({ name: 'synth-dotnet', environment: ENVIRONMENT, agentName: 'dotnet' })
        .instance('my-instance');

      const synthJava = apm
        .service({ name: 'synth-java', environment: ENVIRONMENT, agentName: 'java' })
        .instance('my-instance');

      const traces = range.ratePerMinute(ratePerMinute).generator((timestamp) => {
        return new DistributedTrace({
          serviceInstance: synthRum,
          transactionName: rootTransactionName,
          timestamp,
          children: (_) => {
            _.service({
              repeat: 80,
              serviceInstance: synthNode,
              transactionName: 'GET /nodejs/products',
              latency: 100,

              children: (_) => {
                _.service({
                  serviceInstance: synthGo,
                  transactionName: 'GET /go',
                  children: (_) => {
                    _.service({
                      repeat: 50,
                      serviceInstance: synthJava,
                      transactionName: 'GET /java',
                      children: (_) => {
                        _.external({
                          name: 'GET telemetry.elastic.co',
                          url: 'https://telemetry.elastic.co/ping',
                          duration: 50,
                        });
                      },
                    });
                  },
                });
                _.db({ name: 'GET apm-*/_search', type: 'elasticsearch', duration: 400 });
                _.db({ name: 'GET', type: 'redis', duration: 500 });
                _.db({ name: 'SELECT * FROM users', type: 'sqlite', duration: 600 });
              },
            });

            _.service({
              serviceInstance: synthNode,
              transactionName: 'GET /nodejs/users',
              latency: 100,
              repeat: 40,
              children: (_) => {
                _.service({
                  serviceInstance: synthGo,
                  transactionName: 'GET /go/security',
                  latency: 50,
                  children: (_) => {
                    _.service({
                      repeat: 40,
                      serviceInstance: synthDotnet,
                      transactionName: 'GET /dotnet/cases/4',
                      latency: 50,
                      children: (_) =>
                        _.db({
                          name: 'GET apm-*/_search',
                          type: 'elasticsearch',
                          duration: 600,
                          statement: JSON.stringify(
                            {
                              query: {
                                query_string: {
                                  query: '(new york city) OR (big apple)',
                                  default_field: 'content',
                                },
                              },
                            },
                            null,
                            2
                          ),
                        }),
                    });
                  },
                });
              },
            });
          },
        }).getTransaction();
      });

      return withClient(apmEsClient, traces);
    },
  };
};

export default scenario;
