/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint-disable @typescript-eslint/no-shadow */

import { apm, timerange } from '../..';
import { ApmFields } from '../lib/apm/apm_fields';
import { Scenario } from '../cli/scenario';
import { RunOptions } from '../cli/utils/parse_run_cli_flags';
import { getSynthtraceEnvironment } from '../lib/utils/get_synthtrace_environment';
import { DistributedTrace } from '../lib/dsl/distributed_trace_client';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);

const scenario: Scenario<ApmFields> = async (runOptions: RunOptions) => {
  return {
    generate: ({ from, to }) => {
      const ratePerMinute = 1;
      const traceDuration = 1100;
      const rootTransactionName = `${ratePerMinute}rpm / ${traceDuration}ms`;

      const opbeansRum = apm
        .service({ name: 'opbeans-rum', environment: ENVIRONMENT, agentName: 'rum-js' })
        .instance('my-instance');

      const opbeansNode = apm
        .service({ name: 'opbeans-node', environment: ENVIRONMENT, agentName: 'nodejs' })
        .instance('my-instance');

      const opbeansGo = apm
        .service({ name: 'opbeans-go', environment: ENVIRONMENT, agentName: 'go' })
        .instance('my-instance');

      const opbeansDotnet = apm
        .service({ name: 'opbeans-dotnet', environment: ENVIRONMENT, agentName: 'dotnet' })
        .instance('my-instance');

      const opbeansJava = apm
        .service({ name: 'opbeans-java', environment: ENVIRONMENT, agentName: 'java' })
        .instance('my-instance');

      const traces = timerange(from, to)
        .ratePerMinute(ratePerMinute)
        .generator((timestamp) => {
          return new DistributedTrace({
            serviceInstance: opbeansRum,
            transactionName: rootTransactionName,
            timestamp,
            children: (_) => {
              _.service({
                repeat: 10,
                serviceInstance: opbeansNode,
                transactionName: 'GET /nodejs/products',
                latency: 100,

                children: (_) => {
                  _.service({
                    serviceInstance: opbeansGo,
                    transactionName: 'GET /go',
                    children: (_) => {
                      _.service({
                        repeat: 20,
                        serviceInstance: opbeansJava,
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
                serviceInstance: opbeansNode,
                transactionName: 'GET /nodejs/users',
                latency: 100,
                repeat: 10,
                children: (_) => {
                  _.service({
                    serviceInstance: opbeansGo,
                    transactionName: 'GET /go/security',
                    latency: 50,
                    children: (_) => {
                      _.service({
                        repeat: 10,
                        serviceInstance: opbeansDotnet,
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

      return traces;
    },
  };
};

export default scenario;
