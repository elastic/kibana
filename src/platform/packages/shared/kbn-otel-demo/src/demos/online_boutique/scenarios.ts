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
 * Failure scenarios for Google Online Boutique.
 * These simulate real-world misconfigurations and failures.
 */
export const ONLINE_BOUTIQUE_SCENARIOS: FailureScenario[] = [
  // ============ DRAMATIC FAILURES ============
  {
    id: 'cart-redis-disconnect',
    name: 'Cart Redis Disconnect',
    description: `Cart service points at an invalid Redis endpoint, so all cart operations fail.
Checkout collapses and frontend returns 500s whenever users access their shopping cart.`,
    category: 'dramatic',
    steps: [
      {
        type: 'env',
        service: 'cartservice',
        variable: 'REDIS_ADDR',
        value: 'redis-cart:9999',
        description: 'Point cart at a dead Redis port',
      },
    ],
    recovery: [
      {
        type: 'env',
        service: 'cartservice',
        variable: 'REDIS_ADDR',
        value: 'redis-cart:6379',
        description: 'Restore Redis address',
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
        service: 'checkoutservice',
        variable: 'CURRENCY_SERVICE_ADDR',
        value: 'currencyservice:9999',
        description: 'Point checkout to wrong currency port',
      },
      {
        type: 'env',
        service: 'frontend',
        variable: 'CURRENCY_SERVICE_ADDR',
        value: 'currencyservice:9999',
        description: 'Point frontend to wrong currency port',
      },
    ],
    recovery: [
      {
        type: 'env',
        service: 'checkoutservice',
        variable: 'CURRENCY_SERVICE_ADDR',
        value: 'currencyservice:7000',
        description: 'Restore checkout currency address',
      },
      {
        type: 'env',
        service: 'frontend',
        variable: 'CURRENCY_SERVICE_ADDR',
        value: 'currencyservice:7000',
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
        value: 'productcatalogservice:9999',
        description: 'Point frontend to wrong product catalog port',
      },
    ],
    recovery: [
      {
        type: 'env',
        service: 'frontend',
        variable: 'PRODUCT_CATALOG_SERVICE_ADDR',
        value: 'productcatalogservice:3550',
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
        service: 'checkoutservice',
        variable: 'PAYMENT_SERVICE_ADDR',
        value: 'paymentservice:9999',
        description: 'Point checkout to wrong payment port',
      },
    ],
    recovery: [
      {
        type: 'env',
        service: 'checkoutservice',
        variable: 'PAYMENT_SERVICE_ADDR',
        value: 'paymentservice:50051',
        description: 'Restore payment service address',
      },
    ],
  },
  {
    id: 'shipping-unreachable',
    name: 'Shipping Service Unreachable',
    description: `Checkout cannot calculate shipping costs. Orders fail during checkout,
impacting the purchase flow.`,
    category: 'dramatic',
    steps: [
      {
        type: 'env',
        service: 'checkoutservice',
        variable: 'SHIPPING_SERVICE_ADDR',
        value: 'shippingservice:9999',
        description: 'Point checkout to wrong shipping port',
      },
    ],
    recovery: [
      {
        type: 'env',
        service: 'checkoutservice',
        variable: 'SHIPPING_SERVICE_ADDR',
        value: 'shippingservice:50051',
        description: 'Restore shipping service address',
      },
    ],
  },

  // ============ SUBTLE FAILURES ============
  {
    id: 'load-generator-ramp',
    name: 'Load Generator Ramp',
    description: `Triple the number of users to 30, creating resource pressure
that raises latency and error rates without taking services down.`,
    category: 'subtle',
    steps: [
      {
        type: 'env',
        service: 'loadgenerator',
        variable: 'USERS',
        value: '30',
        description: 'Increase user count',
      },
    ],
    recovery: [
      {
        type: 'env',
        service: 'loadgenerator',
        variable: 'USERS',
        value: '10',
        description: 'Restore user count',
      },
    ],
  },
  {
    id: 'load-generator-spike',
    name: 'Load Generator Spike',
    description: `Spike user count to 50, creating significant resource pressure.
Services may become slow or intermittently unavailable under this extreme load.`,
    category: 'subtle',
    steps: [
      {
        type: 'env',
        service: 'loadgenerator',
        variable: 'USERS',
        value: '50',
        description: 'Spike user count',
      },
    ],
    recovery: [
      {
        type: 'env',
        service: 'loadgenerator',
        variable: 'USERS',
        value: '10',
        description: 'Restore user count',
      },
    ],
  },
  {
    id: 'recommendation-unavailable',
    name: 'Recommendations Unavailable',
    description: `Frontend cannot reach recommendation service. Shopping experience degrades
as product recommendations disappear, but core purchasing still works.`,
    category: 'subtle',
    steps: [
      {
        type: 'env',
        service: 'frontend',
        variable: 'RECOMMENDATION_SERVICE_ADDR',
        value: 'recommendationservice:9999',
        description: 'Point frontend to wrong recommendation port',
      },
    ],
    recovery: [
      {
        type: 'env',
        service: 'frontend',
        variable: 'RECOMMENDATION_SERVICE_ADDR',
        value: 'recommendationservice:8080',
        description: 'Restore recommendation service address',
      },
    ],
  },
  {
    id: 'ad-service-down',
    name: 'Ad Service Down',
    description: `Frontend cannot reach the ad service. Advertisements stop displaying,
but the shopping experience continues normally. Revenue impact without user-facing errors.`,
    category: 'subtle',
    steps: [
      {
        type: 'env',
        service: 'frontend',
        variable: 'AD_SERVICE_ADDR',
        value: 'adservice:9999',
        description: 'Point frontend to wrong ad service port',
      },
    ],
    recovery: [
      {
        type: 'env',
        service: 'frontend',
        variable: 'AD_SERVICE_ADDR',
        value: 'adservice:9555',
        description: 'Restore ad service address',
      },
    ],
  },
];
