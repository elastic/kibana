/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { apm, ApmFields, Instance } from '@kbn/apm-synthtrace-client';
import { Transaction } from '@kbn/apm-synthtrace-client/src/lib/apm/transaction';
import { Scenario } from '../cli/scenario';

import { RunOptions } from '../cli/utils/parse_run_cli_flags';
// import { getSynthtraceEnvironment } from '../lib/utils/get_synthtrace_environment';

// const ENVIRONMENT = getSynthtraceEnvironment(__filename);

const scenario: Scenario<ApmFields> = async (runOptions: RunOptions) => {
  return {
    generate: ({ range }) => {
      const go = apm
        .service({ name: 'synthbeans-go', environment: 'test', agentName: 'go' })
        .instance('synthbeans-go');
      const java = apm
        .service({ name: 'synthbeans-java', environment: 'test', agentName: 'java' })
        .instance('synthbeans-java');
      const node = apm
        .service({ name: 'synthbeans-node', environment: 'test', agentName: 'nodejs' })
        .instance('synthbeans-node');

      function generateTrace(timestamp: number, order: Instance[], db?: 'elasticsearch' | 'redis') {
        return order
          .concat()
          .reverse()
          .reduce<Transaction | undefined>((prev, instance, index) => {
            const invertedIndex = order.length - index - 1;

            const duration = 50;
            const time = timestamp + invertedIndex * 10;

            const transaction: Transaction = instance
              .transaction({ transactionName: `GET /${instance.fields['service.name']!}/api` })
              .timestamp(time)
              .duration(duration);

            if (prev) {
              const next = order[invertedIndex + 1].fields['service.name']!;
              transaction.children(
                instance
                  .span({ spanName: `GET ${next}/api`, spanType: 'external', spanSubtype: 'http' })
                  .destination(next)
                  .duration(duration)
                  .timestamp(time + 1)
                  .children(prev)
              );
            } else if (db) {
              transaction.children(
                instance
                  .span({ spanName: db, spanType: 'db', spanSubtype: db })
                  .destination(db)
                  .duration(duration)
                  .timestamp(time + 1)
              );
            }

            return transaction;
          }, undefined)!;
      }

      return range
        .interval('1s')
        .rate(3)
        .generator((timestamp) => {
          return [
            generateTrace(timestamp, [go, java]),
            generateTrace(timestamp, [java, go], 'redis'),
            generateTrace(timestamp, [node], 'redis'),
            generateTrace(timestamp, [node, java, go], 'elasticsearch'),
            generateTrace(timestamp, [go, node, java]),
          ];
        });
    },
  };
};

export default scenario;
