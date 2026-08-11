/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ServiceEdge, ServiceGraph, ServiceNode } from '../../../lib/service_graph_logs/types';
import { defineMockApp } from '../utils';

// E-commerce checkout pipeline:
//   storefront → cart-service / checkout-orchestrator
//   checkout-orchestrator → payment-gateway / inventory-service / fulfillment
// Error pools deliberately include security-flavoured lines (payment fraud, auth
// abuse) so query generation produces high-severity (security-class) queries.
const SERVICES = [
  {
    name: 'storefront',
    runtime: 'node',
    infraDeps: ['kafka', 'redis'],
    version: '3.2.0',
    deployment: { k8s: { namespace: 'storefront' } },
    serviceLogs: {
      success: ['Page rendered', 'Product listing served', 'Session established'],
      error: [
        'Unauthorized access attempt to checkout session: invalid session token',
        'Suspicious request rate from single client: possible credential stuffing',
        'Failed to render product page: upstream catalog service unavailable',
      ],
    },
  } as const,
  {
    name: 'cart-service',
    runtime: 'go',
    infraDeps: ['redis', 'postgres'],
    version: '2.5.1',
    deployment: { k8s: { namespace: 'cart' } },
    serviceLogs: {
      success: ['Cart updated', 'Item added to cart', 'Cart retrieved from cache'],
      error: [
        'Cart persistence failed: redis cache eviction under memory pressure',
        'Cart reconciliation failed: stale cart version conflict',
      ],
    },
  } as const,
  {
    name: 'checkout-orchestrator',
    runtime: 'java',
    infraDeps: ['postgres', 'kafka'],
    version: '4.0.3',
    deployment: { k8s: { namespace: 'checkout' } },
    serviceLogs: {
      success: ['Checkout completed', 'Order created', 'Checkout saga committed'],
      error: [
        'Checkout saga aborted: payment authorization step failed',
        'Order persistence failed: database transaction rolled back after timeout',
        'Unhandled error in checkout pipeline: order processing aborted',
      ],
    },
  } as const,
  {
    name: 'payment-gateway',
    runtime: 'python',
    infraDeps: ['postgres', 'elasticsearch'],
    version: '1.9.4',
    deployment: { k8s: { namespace: 'payments' } },
    serviceLogs: {
      success: ['Payment authorized', 'Transaction captured', 'Refund processed'],
      error: [
        'Fraudulent card pattern detected: declining transaction and flagging account',
        'PCI tokenization failed: card vault returned an unexpected error',
        'Payment authorization timeout: acquiring bank unreachable after 30s',
        'Chargeback risk threshold exceeded: transaction held for manual review',
      ],
    },
  } as const,
  {
    name: 'inventory-service',
    runtime: 'go',
    infraDeps: ['postgres', 'mongodb'],
    version: '2.1.0',
    deployment: { k8s: { namespace: 'inventory' } },
    serviceLogs: {
      success: ['Stock reserved', 'Inventory level updated', 'Reservation released'],
      error: [
        'Stock reservation failed: oversell guard rejected request',
        'Inventory read failed: primary datastore connection timeout',
      ],
    },
  } as const,
  {
    name: 'fulfillment',
    runtime: 'node',
    infraDeps: ['kafka', 'mongodb'],
    version: '1.4.2',
    deployment: { k8s: { namespace: 'fulfillment' } },
    serviceLogs: {
      success: ['Shipment scheduled', 'Order dispatched', 'Carrier notified'],
      error: [
        'Shipment scheduling failed: carrier API returned 502',
        'Event publish failed: unable to reach Kafka broker after 3 retries',
      ],
    },
  } as const,
] satisfies ServiceNode[];

const EDGES = [
  { source: 'storefront', target: 'cart-service', protocol: 'http' },
  { source: 'storefront', target: 'checkout-orchestrator', protocol: 'http' },
  { source: 'checkout-orchestrator', target: 'payment-gateway', protocol: 'http' },
  { source: 'checkout-orchestrator', target: 'inventory-service', protocol: 'grpc' },
  { source: 'checkout-orchestrator', target: 'fulfillment', protocol: 'kafka' },
  { source: 'inventory-service', target: 'fulfillment', protocol: 'kafka' },
] satisfies ServiceEdge[];

const ECOMMERCE_GRAPH = { edges: EDGES, services: SERVICES } satisfies ServiceGraph;

export const ECOMMERCE_APP = defineMockApp({
  serviceGraph: ECOMMERCE_GRAPH,
  entryService: 'storefront',
  scenarios: {
    // All services healthy.
    healthy_baseline: {
      build() {
        return {};
      },
    },

    // payment-gateway gateway-times out at 70% for 5 min; 2-min warn ramp; cascades to checkout-orchestrator.
    payment_gateway_timeout: {
      cycleDurationMinutes: 10,
      build({ phase, phases }) {
        return phases([
          phase('0m', '2m', {
            failures: {
              services: { 'payment-gateway': { errorType: 'gateway_timeout', rate: 0.2 } },
            },
            volume: { 'checkout-orchestrator': { scale: 1.5 }, 'payment-gateway': { scale: 3 } },
            noise: { scale: 3 },
          }),
          phase('2m', '7m', {
            failures: {
              services: { 'payment-gateway': { errorType: 'gateway_timeout', rate: 0.7 } },
            },
            volume: { 'checkout-orchestrator': { scale: 1.5 }, 'payment-gateway': { scale: 3 } },
            noise: { scale: 3 },
          }),
        ]);
      },
    },

    // postgres times out at 80% for 5 min; cascades to inventory, checkout, payment, cart.
    inventory_db_timeout: {
      cycleDurationMinutes: 10,
      build({ phase }) {
        return phase('0m', '5m', {
          failures: { infra: { postgres: { errorType: 'db_timeout', rate: 0.8 } } },
          volume: { 'inventory-service': { scale: 2 }, postgres: { scale: 4 } },
          noise: { scale: 2 },
        });
      },
    },

    // redis cache evicts hot keys at 60% for 5 min; cart-service and storefront degrade.
    redis_eviction: {
      cycleDurationMinutes: 10,
      build({ phase }) {
        return phase('0m', '5m', {
          failures: { infra: { redis: { errorType: 'cache_failure', rate: 0.6 } } },
          volume: { 'cart-service': { scale: 3 }, redis: { scale: 4 } },
          noise: { scale: 3 },
        });
      },
    },

    // kafka broker outage at 70% for 6 min; checkout event publish and fulfillment stall.
    kafka_broker_outage: {
      cycleDurationMinutes: 10,
      build({ phase }) {
        return phase('0m', '6m', {
          failures: { infra: { kafka: { errorType: 'message_queue_failure', rate: 0.7 } } },
          volume: { fulfillment: { scale: 2 }, kafka: { scale: 4 } },
          noise: { scale: 3 },
        });
      },
    },

    // Three-stage checkout meltdown: postgres timeout → checkout-orchestrator OOM → CrashLoopBackOff.
    checkout_meltdown: {
      cycleDurationMinutes: 12,
      build({ phase, phases }) {
        return phases([
          phase('0m', '2m', {
            failures: { infra: { postgres: { errorType: 'db_timeout', rate: 0.8 } } },
            volume: { 'checkout-orchestrator': { scale: 3 }, postgres: { scale: 4 } },
            noise: { scale: 3 },
          }),
          phase('2m', '6m', {
            failures: {
              infra: { postgres: { errorType: 'db_timeout', rate: 0.8 } },
              services: {
                'checkout-orchestrator': { errorType: 'k8s_oom', rate: 0.6, multiplier: 4 },
              },
            },
            volume: { 'checkout-orchestrator': { scale: 10 }, postgres: { scale: 4 } },
            noise: { scale: 10 },
          }),
          phase('6m', '9m', {
            failures: {
              services: {
                'checkout-orchestrator': {
                  errorType: 'k8s_crash_loop_backoff',
                  rate: 0.95,
                  multiplier: 5,
                },
              },
            },
            volume: { 'checkout-orchestrator': { scale: 2 } },
            noise: { scale: 6 },
          }),
        ]);
      },
    },

    // Flash-sale traffic surge: storefront/cart 5× burst, payment-gateway times out under load; credential-stuffing noise.
    flash_sale_surge: {
      cycleDurationMinutes: 10,
      build({ phase }) {
        return {
          ...phase('0m', '6m', {
            failures: {
              services: { 'payment-gateway': { errorType: 'gateway_timeout', rate: 0.5 } },
            },
            volume: {
              storefront: { scale: 5 },
              'cart-service': { scale: 5 },
              'payment-gateway': { scale: 3 },
            },
            noise: { scale: 5 },
          }),
          ghostMentions: [
            {
              message: 'WAF blocked suspected credential-stuffing burst from botnet range',
              rate: 0.4,
            },
            {
              message: 'Rate limiter tripped: anomalous checkout attempt volume per IP',
              rate: 0.3,
            },
          ],
        };
      },
    },
  },
});
