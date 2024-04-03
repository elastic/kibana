/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ApmFields, serviceMap } from '@kbn/apm-synthtrace-client';
import { Scenario } from '../cli/scenario';
import { RunOptions } from '../cli/utils/parse_run_cli_flags';
import { getSynthtraceEnvironment } from '../lib/utils/get_synthtrace_environment';
import { withClient } from '../lib/utils/with_client';

const environment = getSynthtraceEnvironment(__filename);

const scenario: Scenario<ApmFields> = async (runOptions: RunOptions) => {
  return {
    generate: ({ range, clients: { apmEsClient } }) => {
      return withClient(
        apmEsClient,
        range
          .interval('1s')
          .rate(3)
          .generator(
            serviceMap({
              services: [
                { 'frontend-rum': 'rum-js' },
                { 'frontend-node': 'nodejs' },
                { advertService: 'java' },
                { checkoutService: 'go' },
                { cartService: 'dotnet' },
                { paymentService: 'nodejs' },
                { productCatalogService: 'go' },
              ],
              environment,
              definePaths([rum, node, adv, chk, cart, pay, prod]) {
                return [
                  [
                    [rum, 'fetchAd'],
                    [node, 'GET /nodejs/adTag'],
                    [adv, 'APIRestController#getAd'],
                    ['elasticsearch', 'GET ad-*/_search'],
                  ],
                  [
                    [rum, 'AddToCart'],
                    [node, 'POST /nodejs/addToCart'],
                    [cart, 'POST /dotnet/reserveProduct'],
                    ['redis', 'DECR inventory:i012345:stock'],
                  ],
                  [
                    [rum, 'Checkout'],
                    [node, 'POST /nodejs/placeOrder'],
                    [chk, 'POST /go/placeOrder'],
                    [pay, 'POST /nodejs/processPayment'],
                  ],
                  [
                    [chk, 'POST /go/clearCart'],
                    [cart, 'PUT /dotnet/cart/c12345/reset'],
                    ['redis', 'INCR inventory:i012345:stock'],
                  ],
                  [
                    [rum, 'ProductDashboard'],
                    [node, 'GET /nodejs/products'],
                    [prod, 'GET /go/product-catalog'],
                    ['elasticsearch', 'GET product-*/_search'],
                  ],
                  [
                    [chk, 'PUT /go/update-inventory'],
                    [prod, 'PUT /go/product/i012345'],
                  ],
                  [pay],
                ];
              },
            })
          )
      );
    },
  };
};

export default scenario;
