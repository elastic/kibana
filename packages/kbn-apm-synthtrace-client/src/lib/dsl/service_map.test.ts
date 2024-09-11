/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { pick } from 'lodash';
import { ApmFields } from '../apm/apm_fields';
import { BaseSpan } from '../apm/base_span';
import { serviceMap, ServiceMapOpts } from './service_map';

describe('serviceMap', () => {
  const TIMESTAMP = 1677693600000;

  describe('Basic definition', () => {
    const BASIC_SERVICE_MAP_OPTS: ServiceMapOpts = {
      services: [
        'frontend-rum',
        'frontend-node',
        'advertService',
        'checkoutService',
        'cartService',
        'paymentService',
        'productCatalogService',
      ],
      definePaths([rum, node, adv, chk, cart, pay, prod]) {
        return [
          [rum, node, adv, 'elasticsearch'],
          [rum, node, cart, 'redis'],
          [rum, node, chk, pay],
          [chk, cart, 'redis'],
          [rum, node, prod, 'elasticsearch'],
          [chk, prod],
        ];
      },
    };

    it('should create an accurate set of trace paths', () => {
      const serviceMapGenerator = serviceMap(BASIC_SERVICE_MAP_OPTS);
      const transactions = serviceMapGenerator(TIMESTAMP);
      expect(transactions.map(getTracePathLabel)).toMatchInlineSnapshot(`
        Array [
          "frontend-rum → frontend-node → advertService → elasticsearch",
          "frontend-rum → frontend-node → cartService → redis",
          "frontend-rum → frontend-node → checkoutService → paymentService",
          "checkoutService → cartService → redis",
          "frontend-rum → frontend-node → productCatalogService → elasticsearch",
          "checkoutService → productCatalogService",
        ]
      `);
    });

    it('should use a default agent name if not defined', () => {
      const serviceMapGenerator = serviceMap(BASIC_SERVICE_MAP_OPTS);
      const transactions = serviceMapGenerator(TIMESTAMP);
      const traceDocs = transactions.flatMap(getTraceDocsSubset);
      for (const doc of traceDocs) {
        expect(doc).toHaveProperty(['agent.name'], 'nodejs');
      }
    });

    it('should use a default transaction/span names if not defined', () => {
      const serviceMapGenerator = serviceMap(BASIC_SERVICE_MAP_OPTS);
      const transactions = serviceMapGenerator(TIMESTAMP);
      const traceDocs = transactions.map(getTraceDocsSubset);
      for (let i = 0; i < traceDocs.length; i++) {
        for (const doc of traceDocs[i]) {
          const serviceName = doc['service.name'];
          if (doc['processor.event'] === 'transaction') {
            expect(doc).toHaveProperty(['transaction.name'], `GET /api/${serviceName}/${i}`);
          }
          if (doc['processor.event'] === 'span') {
            if (doc['span.type'] === 'db') {
              switch (doc['span.subtype']) {
                case 'elasticsearch':
                  expect(doc).toHaveProperty(['span.name'], `GET ad-*/_search`);
                  break;
                case 'redis':
                  expect(doc).toHaveProperty(['span.name'], `INCR item:i012345:count`);
                  break;
                case 'sqlite':
                  expect(doc).toHaveProperty(['span.name'], `SELECT * FROM items`);
                  break;
              }
            } else {
              expect(doc).toHaveProperty(['span.name'], `GET /api/${serviceName}/${i}`);
            }
          }
        }
      }
    });

    it('should create one parent transaction per trace', () => {
      const serviceMapGenerator = serviceMap(BASIC_SERVICE_MAP_OPTS);
      const transactions = serviceMapGenerator(TIMESTAMP);
      const traces = transactions.map(getTraceDocsSubset);
      for (const traceDocs of traces) {
        const [transaction, ...spans] = traceDocs;
        expect(transaction).toHaveProperty(['processor.event'], 'transaction');
        expect(
          spans.every(({ 'processor.event': processorEvent }) => processorEvent === 'span')
        ).toBe(true);
      }
    });
  });
  describe('Detailed definition', () => {
    const DETAILED_SERVICE_MAP_OPTS: ServiceMapOpts = {
      services: [
        { 'frontend-rum': 'rum-js' },
        { 'frontend-node': 'nodejs' },
        { advertService: 'java' },
        { checkoutService: 'go' },
        { cartService: 'dotnet' },
        { paymentService: 'nodejs' },
        { productCatalogService: 'go' },
      ],
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
          {
            path: [
              [rum, 'Checkout'],
              [node, 'POST /nodejs/placeOrder'],
              [chk, 'POST /go/placeOrder'],
              [pay, 'POST /nodejs/processPayment'],
            ],
            transaction: (t) => t.defaults({ 'labels.name': 'transaction hook test' }),
          },
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
    };

    const SERVICE_AGENT_MAP: Record<string, string> = {
      'frontend-rum': 'rum-js',
      'frontend-node': 'nodejs',
      advertService: 'java',
      checkoutService: 'go',
      cartService: 'dotnet',
      paymentService: 'nodejs',
      productCatalogService: 'go',
    };

    it('should use the defined agent name for a given service', () => {
      const serviceMapGenerator = serviceMap(DETAILED_SERVICE_MAP_OPTS);
      const transactions = serviceMapGenerator(TIMESTAMP);
      const traceDocs = transactions.flatMap(getTraceDocsSubset);
      for (const doc of traceDocs) {
        if (!(doc['service.name']! in SERVICE_AGENT_MAP)) {
          throw new Error(`Unexpected service name '${doc['service.name']}' found`);
        }

        expect(doc).toHaveProperty(['agent.name'], SERVICE_AGENT_MAP[doc['service.name']!]);
      }
    });

    it('should use the defined transaction/span names for each trace document', () => {
      const serviceMapGenerator = serviceMap(DETAILED_SERVICE_MAP_OPTS);
      const transactions = serviceMapGenerator(TIMESTAMP);
      const traceDocs = transactions.map((transaction) => {
        return getTraceDocsSubset(transaction).map(
          ({ 'span.name': spanName, 'transaction.name': transactionName }) =>
            transactionName || spanName
        );
      });
      expect(traceDocs).toMatchInlineSnapshot(`
        Array [
          Array [
            "fetchAd",
            "fetchAd",
            "GET /nodejs/adTag",
            "APIRestController#getAd",
            "GET ad-*/_search",
          ],
          Array [
            "AddToCart",
            "AddToCart",
            "POST /nodejs/addToCart",
            "POST /dotnet/reserveProduct",
            "DECR inventory:i012345:stock",
          ],
          Array [
            "Checkout",
            "Checkout",
            "POST /nodejs/placeOrder",
            "POST /go/placeOrder",
            "POST /nodejs/processPayment",
          ],
          Array [
            "POST /go/clearCart",
            "POST /go/clearCart",
            "PUT /dotnet/cart/c12345/reset",
            "INCR inventory:i012345:stock",
          ],
          Array [
            "ProductDashboard",
            "ProductDashboard",
            "GET /nodejs/products",
            "GET /go/product-catalog",
            "GET product-*/_search",
          ],
          Array [
            "PUT /go/update-inventory",
            "PUT /go/update-inventory",
            "PUT /go/product/i012345",
          ],
          Array [
            "GET /api/paymentService/6",
            "GET /api/paymentService/6",
          ],
        ]
      `);
    });

    it('should apply the transaction hook function if defined', () => {
      const serviceMapGenerator = serviceMap(DETAILED_SERVICE_MAP_OPTS);
      const transactions = serviceMapGenerator(TIMESTAMP);
      expect(transactions[2].fields['labels.name']).toBe('transaction hook test');
    });
  });
});

function getTraceDocsSubset(transaction: BaseSpan): ApmFields[] {
  const subsetFields = pick(transaction.fields, [
    'processor.event',
    'service.name',
    'agent.name',
    'transaction.name',
    'span.name',
    'span.type',
    'span.subtype',
    'span.destination.service.resource',
  ]);

  const children = transaction.getChildren();
  if (children) {
    const childFields = children.flatMap((child) => getTraceDocsSubset(child));
    return [subsetFields, ...childFields];
  }
  return [subsetFields];
}

function getTracePathLabel(transaction: BaseSpan) {
  const traceDocs = getTraceDocsSubset(transaction);
  const traceSpans = traceDocs.filter((doc) => doc['processor.event'] === 'span');
  const spanLabels = traceSpans.map((span) =>
    span['span.type'] === 'db' ? span['span.subtype'] : span['service.name']
  );
  return spanLabels.join(' → ');
}
