/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { apm, ApmFields, Instance } from '@kbn/apm-synthtrace-client';
import { Transaction } from '@kbn/apm-synthtrace-client/src/lib/apm/transaction';
import { AgentName } from '@kbn/apm-plugin/typings/es_schemas/ui/fields/agent';
import { Scenario } from '../cli/scenario';
import { RunOptions } from '../cli/utils/parse_run_cli_flags';
import { getSynthtraceEnvironment } from '../lib/utils/get_synthtrace_environment';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);

function generateTrace(
  timestamp: number,
  transactionName: string,
  order: Instance[],
  db?: 'elasticsearch' | 'redis'
) {
  return order
    .concat()
    .reverse()
    .reduce<Transaction | undefined>((prev, instance, index) => {
      const invertedIndex = order.length - index - 1;

      const duration = 50;
      const time = timestamp + invertedIndex * 10;

      const transaction: Transaction = instance
        .transaction({ transactionName })
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

function service(serviceName: string, agentName: AgentName) {
  return apm
    .service({ name: serviceName, environment: ENVIRONMENT, agentName })
    .instance(serviceName);
}

const scenario: Scenario<ApmFields> = async (runOptions: RunOptions) => {
  return {
    generate: ({ range }) => {
      const frontendRum = service('frontend-rum', 'rum-js');
      const frontendNode = service('frontend-node', 'nodejs');
      const advertService = service('advertService', 'java');
      const checkoutService = service('checkoutService', 'go');
      const cartService = service('cartService', 'dotnet');
      const paymentService = service('paymentService', 'nodejs');
      const productCatalogService = service('productCatalogService', 'go');
      return range
        .interval('1s')
        .rate(3)
        .generator((timestamp) => {
          return [
            generateTrace(
              timestamp,
              'GET /api/adTag',
              [frontendRum, frontendNode, advertService],
              'elasticsearch'
            ),
            generateTrace(
              timestamp,
              'POST /api/addToCart',
              [frontendRum, frontendNode, cartService],
              'redis'
            ),
            generateTrace(timestamp, 'POST /api/checkout', [
              frontendRum,
              frontendNode,
              checkoutService,
              paymentService,
            ]),
            generateTrace(
              timestamp,
              'DELETE /api/clearCart',
              [checkoutService, cartService],
              'redis'
            ),
            generateTrace(
              timestamp,
              'GET /api/products',
              [frontendRum, frontendNode, productCatalogService],
              'elasticsearch'
            ),
            generateTrace(timestamp, 'PUT /api/updateInventory', [
              checkoutService,
              productCatalogService,
            ]),
          ];
        });
    },
  };
};

export default scenario;
