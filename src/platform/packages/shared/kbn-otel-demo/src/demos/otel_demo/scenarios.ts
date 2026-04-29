/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FailureScenario } from '../../types';

/**
 * Failure scenarios for the OpenTelemetry Demo.
 * These simulate real-world misconfigurations and failures.
 */
export const OTEL_DEMO_SCENARIOS: FailureScenario[] = [
  // ============ DRAMATIC FAILURES ============
  {
    id: 'cart-redis-cutoff',
    name: 'Cart Redis Cutoff',
    description: `Cart now points at an invalid Valkey endpoint, so all cart mutations fail.
Checkout collapses and frontend writes 500s whenever baskets are accessed.`,
    category: 'dramatic',
    steps: [
      {
        type: 'env',
        service: 'cart',
        variable: 'VALKEY_ADDR',
        value: 'valkey:9999',
        description: 'Point cart at a dead Valkey port',
      },
    ],
    recovery: [
      {
        type: 'env',
        service: 'cart',
        variable: 'VALKEY_ADDR',
        value: 'valkey:6379',
        description: 'Restore Valkey address',
      },
    ],
  },
  {
    id: 'checkout-memory-starvation',
    name: 'Checkout Memory Starvation',
    description: `Checkout's Go runtime memory ceiling is crushed to 4 MiB, so garbage collection
thrashes and workers crash under load. Requests pile up and dependent services
see timeouts even though checkout stays technically reachable.`,
    category: 'dramatic',
    steps: [
      {
        type: 'env',
        service: 'checkout',
        variable: 'GOMEMLIMIT',
        value: '4MiB',
        description: 'Clamp checkout GOMEMLIMIT to 4 MiB',
      },
    ],
    recovery: [
      {
        type: 'env',
        service: 'checkout',
        variable: 'GOMEMLIMIT',
        value: '16MiB',
        description: 'Restore checkout GOMEMLIMIT',
      },
    ],
  },
  {
    id: 'currency-unreachable',
    name: 'Currency Service Unreachable',
    description: `Checkout and frontend cannot reach the currency service. All price conversions fail,
breaking the shopping experience for international users.`,
    category: 'dramatic',
    steps: [
      {
        type: 'env',
        service: 'checkout',
        variable: 'CURRENCY_SERVICE_ADDR',
        value: 'currency:9999',
        description: 'Point checkout to wrong currency port',
      },
      {
        type: 'env',
        service: 'frontend',
        variable: 'CURRENCY_SERVICE_ADDR',
        value: 'currency:9999',
        description: 'Point frontend to wrong currency port',
      },
    ],
    recovery: [
      {
        type: 'env',
        service: 'checkout',
        variable: 'CURRENCY_SERVICE_ADDR',
        value: 'currency:7285',
        description: 'Restore checkout currency address',
      },
      {
        type: 'env',
        service: 'frontend',
        variable: 'CURRENCY_SERVICE_ADDR',
        value: 'currency:7285',
        description: 'Restore frontend currency address',
      },
    ],
  },
  {
    id: 'product-catalog-unreachable',
    name: 'Product Catalog Unreachable',
    description: `Frontend points to a wrong product catalog address. Product listings fail,
breaking the entire shopping experience.`,
    category: 'dramatic',
    steps: [
      {
        type: 'env',
        service: 'frontend',
        variable: 'PRODUCT_CATALOG_SERVICE_ADDR',
        value: 'product-catalog:9999',
        description: 'Point frontend to wrong product catalog port',
      },
    ],
    recovery: [
      {
        type: 'env',
        service: 'frontend',
        variable: 'PRODUCT_CATALOG_SERVICE_ADDR',
        value: 'product-catalog:3550',
        description: 'Restore product catalog address',
      },
    ],
  },
  {
    id: 'payment-unreachable',
    name: 'Payment Service Unreachable',
    description: `Checkout cannot reach the payment service. All orders fail at the final step,
leaving customers frustrated with items in cart but unable to purchase.`,
    category: 'dramatic',
    steps: [
      {
        type: 'env',
        service: 'checkout',
        variable: 'PAYMENT_SERVICE_ADDR',
        value: 'payment:9999',
        description: 'Point checkout to wrong payment port',
      },
    ],
    recovery: [
      {
        type: 'env',
        service: 'checkout',
        variable: 'PAYMENT_SERVICE_ADDR',
        value: 'payment:50051',
        description: 'Restore payment service address',
      },
    ],
  },

  // ============ SUBTLE FAILURES ============
  {
    id: 'checkout-memory-pressure',
    name: 'Checkout Memory Ceiling Halved',
    description: `Halving checkout's Go memory limit to 8 MiB increases GC pressure, bumping
latency and occasional 500s under load but keeping the service technically up.`,
    category: 'subtle',
    steps: [
      {
        type: 'env',
        service: 'checkout',
        variable: 'GOMEMLIMIT',
        value: '8MiB',
        description: 'Shrink checkout GOMEMLIMIT',
      },
    ],
    recovery: [
      {
        type: 'env',
        service: 'checkout',
        variable: 'GOMEMLIMIT',
        value: '16MiB',
        description: 'Restore checkout GOMEMLIMIT',
      },
    ],
  },
  {
    id: 'load-generator-ramp',
    name: 'Load Generator Ramp',
    description: `Triple the number of Locust users to 30, creating resource pressure
that raises latency and error rates without taking services down.`,
    category: 'subtle',
    steps: [
      {
        type: 'env',
        service: 'load-generator',
        variable: 'LOCUST_USERS',
        value: '30',
        description: 'Increase Locust user count',
      },
    ],
    recovery: [
      {
        type: 'env',
        service: 'load-generator',
        variable: 'LOCUST_USERS',
        value: '10',
        description: 'Restore Locust user count',
      },
    ],
  },
  {
    id: 'frontend-telemetry-drift',
    name: 'Frontend Telemetry Drift',
    description: `Frontend exports under a shadow service name, so dashboards stop aggregating
traffic with the main UI. Operators lose correlated metrics even though users
can still browse and checkout normally.`,
    category: 'subtle',
    steps: [
      {
        type: 'env',
        service: 'frontend',
        variable: 'WEB_OTEL_SERVICE_NAME',
        value: 'frontend-shadow',
        description: 'Rename the frontend OTEL service identity',
      },
    ],
    recovery: [
      {
        type: 'env',
        service: 'frontend',
        variable: 'WEB_OTEL_SERVICE_NAME',
        value: 'frontend-web',
        description: 'Restore frontend OTEL service identity',
      },
    ],
  },
  {
    id: 'recommendation-telemetry-alias',
    name: 'Recommendation Telemetry Alias',
    description: `Recommendation keeps running but now exports under a shadow OTEL service
identity. Dashboards split the traffic into a new tile, delaying anomaly
detection even though responses still succeed.`,
    category: 'subtle',
    steps: [
      {
        type: 'env',
        service: 'recommendation',
        variable: 'OTEL_SERVICE_NAME',
        value: 'recommendation-shadow',
        description: 'Rename recommendation OTEL service',
      },
    ],
    recovery: [
      {
        type: 'env',
        service: 'recommendation',
        variable: 'OTEL_SERVICE_NAME',
        value: 'recommendation',
        description: 'Restore recommendation OTEL service name',
      },
    ],
  },
  {
    id: 'frontend-telemetry-silence',
    name: 'Frontend Telemetry Silence',
    description: `Frontend now exports telemetry to the wrong OTLP port, so spans
quietly vanish. The app works, but observability pipelines go dark for the UI.`,
    category: 'subtle',
    steps: [
      {
        type: 'env',
        service: 'frontend',
        variable: 'OTEL_EXPORTER_OTLP_ENDPOINT',
        value: 'http://otel-collector:9999',
        description: 'Send frontend OTLP traffic to wrong port',
      },
    ],
    recovery: [
      {
        type: 'env',
        service: 'frontend',
        variable: 'OTEL_EXPORTER_OTLP_ENDPOINT',
        value: 'http://otel-collector:4317',
        description: 'Restore frontend OTLP endpoint',
      },
    ],
  },
  {
    id: 'flagd-unreachable',
    name: 'Feature Flags Unreachable',
    description: `Services can't reach flagd, causing feature flag evaluations to fail.
Some services handle this gracefully with defaults, others log errors continuously.`,
    category: 'subtle',
    steps: [
      {
        type: 'env',
        service: 'cart',
        variable: 'FLAGD_HOST',
        value: 'flagd-missing',
        description: 'Point cart to non-existent flagd',
      },
      {
        type: 'env',
        service: 'payment',
        variable: 'FLAGD_HOST',
        value: 'flagd-missing',
        description: 'Point payment to non-existent flagd',
      },
      {
        type: 'env',
        service: 'recommendation',
        variable: 'FLAGD_HOST',
        value: 'flagd-missing',
        description: 'Point recommendation to non-existent flagd',
      },
    ],
    recovery: [
      {
        type: 'env',
        service: 'cart',
        variable: 'FLAGD_HOST',
        value: 'flagd',
        description: 'Restore cart flagd host',
      },
      {
        type: 'env',
        service: 'payment',
        variable: 'FLAGD_HOST',
        value: 'flagd',
        description: 'Restore payment flagd host',
      },
      {
        type: 'env',
        service: 'recommendation',
        variable: 'FLAGD_HOST',
        value: 'flagd',
        description: 'Restore recommendation flagd host',
      },
    ],
  },
];
