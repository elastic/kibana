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
 * Failure scenarios for AWS Retail Store Sample.
 * These simulate real-world misconfigurations and failures.
 */
export const AWS_RETAIL_STORE_SCENARIOS: FailureScenario[] = [
  // ============ DRAMATIC FAILURES ============
  {
    id: 'catalog-db-disconnect',
    name: 'Catalog Database Disconnect',
    description: `Catalog service cannot reach the MariaDB database, causing product listings to fail.
Customers cannot browse products, breaking the core shopping experience.`,
    category: 'dramatic',
    steps: [
      {
        type: 'env',
        service: 'catalog',
        variable: 'RETAIL_CATALOG_PERSISTENCE_ENDPOINT',
        value: 'catalog-db:9999',
        description: 'Point catalog service to wrong database port',
      },
    ],
    recovery: [
      {
        type: 'env',
        service: 'catalog',
        variable: 'RETAIL_CATALOG_PERSISTENCE_ENDPOINT',
        value: 'catalog-db:3306',
        description: 'Restore correct database endpoint',
      },
    ],
  },
  {
    id: 'cart-dynamodb-disconnect',
    name: 'Cart DynamoDB Disconnect',
    description: `Cart service cannot reach DynamoDB Local, causing all cart operations to fail.
Customers cannot add items to cart or view their cart contents.`,
    category: 'dramatic',
    steps: [
      {
        type: 'env',
        service: 'cart',
        variable: 'RETAIL_CART_PERSISTENCE_DYNAMODB_ENDPOINT',
        value: 'http://carts-dynamodb:9999',
        description: 'Point cart service to wrong DynamoDB port',
      },
    ],
    recovery: [
      {
        type: 'env',
        service: 'cart',
        variable: 'RETAIL_CART_PERSISTENCE_DYNAMODB_ENDPOINT',
        value: 'http://carts-dynamodb:8000',
        description: 'Restore correct DynamoDB endpoint',
      },
    ],
  },
  {
    id: 'orders-db-disconnect',
    name: 'Orders Database Disconnect',
    description: `Orders service cannot reach PostgreSQL database, causing order processing to fail.
Customers can browse and add to cart but cannot complete checkout.`,
    category: 'dramatic',
    steps: [
      {
        type: 'env',
        service: 'orders',
        variable: 'RETAIL_ORDERS_PERSISTENCE_ENDPOINT',
        value: 'orders-db:9999',
        description: 'Point orders service to wrong database port',
      },
    ],
    recovery: [
      {
        type: 'env',
        service: 'orders',
        variable: 'RETAIL_ORDERS_PERSISTENCE_ENDPOINT',
        value: 'orders-db:5432',
        description: 'Restore correct PostgreSQL endpoint',
      },
    ],
  },
  {
    id: 'checkout-redis-disconnect',
    name: 'Checkout Redis Disconnect',
    description: `Checkout service cannot reach Redis for session state, causing checkout to fail.
Customers cannot proceed through checkout flow.`,
    category: 'dramatic',
    steps: [
      {
        type: 'env',
        service: 'checkout',
        variable: 'RETAIL_CHECKOUT_PERSISTENCE_REDIS_URL',
        value: 'redis://checkout-redis:9999',
        description: 'Point checkout service to wrong Redis port',
      },
    ],
    recovery: [
      {
        type: 'env',
        service: 'checkout',
        variable: 'RETAIL_CHECKOUT_PERSISTENCE_REDIS_URL',
        value: 'redis://checkout-redis:6379',
        description: 'Restore correct Redis URL',
      },
    ],
  },
  {
    id: 'checkout-orders-disconnect',
    name: 'Checkout to Orders Disconnect',
    description: `Checkout service cannot reach orders service, breaking the order submission flow.
Customers can complete checkout forms but orders are never created.`,
    category: 'dramatic',
    steps: [
      {
        type: 'env',
        service: 'checkout',
        variable: 'RETAIL_CHECKOUT_ENDPOINTS_ORDERS',
        value: 'http://orders:9999',
        description: 'Point checkout to wrong orders port',
      },
    ],
    recovery: [
      {
        type: 'env',
        service: 'checkout',
        variable: 'RETAIL_CHECKOUT_ENDPOINTS_ORDERS',
        value: 'http://orders:8080',
        description: 'Restore correct orders endpoint',
      },
    ],
  },

  // ============ SUBTLE FAILURES ============
  {
    id: 'ui-catalog-disconnect',
    name: 'UI Catalog Disconnect',
    description: `UI cannot reach catalog service. Product pages fail to load,
but cart and checkout may still work with cached data.`,
    category: 'subtle',
    steps: [
      {
        type: 'env',
        service: 'ui',
        variable: 'RETAIL_UI_ENDPOINTS_CATALOG',
        value: 'http://catalog:9999',
        description: 'Point UI to wrong catalog port',
      },
    ],
    recovery: [
      {
        type: 'env',
        service: 'ui',
        variable: 'RETAIL_UI_ENDPOINTS_CATALOG',
        value: 'http://catalog:8080',
        description: 'Restore correct catalog endpoint',
      },
    ],
  },
  {
    id: 'ui-cart-disconnect',
    name: 'UI Cart Disconnect',
    description: `UI cannot reach cart service. Cart icon shows errors,
but product browsing continues to work.`,
    category: 'subtle',
    steps: [
      {
        type: 'env',
        service: 'ui',
        variable: 'RETAIL_UI_ENDPOINTS_CARTS',
        value: 'http://cart:9999',
        description: 'Point UI to wrong cart port',
      },
    ],
    recovery: [
      {
        type: 'env',
        service: 'ui',
        variable: 'RETAIL_UI_ENDPOINTS_CARTS',
        value: 'http://cart:8080',
        description: 'Restore correct cart endpoint',
      },
    ],
  },
  {
    id: 'ui-checkout-disconnect',
    name: 'UI Checkout Disconnect',
    description: `UI cannot reach checkout service. Checkout button fails,
but browsing and cart management still work.`,
    category: 'subtle',
    steps: [
      {
        type: 'env',
        service: 'ui',
        variable: 'RETAIL_UI_ENDPOINTS_CHECKOUT',
        value: 'http://checkout:9999',
        description: 'Point UI to wrong checkout port',
      },
    ],
    recovery: [
      {
        type: 'env',
        service: 'ui',
        variable: 'RETAIL_UI_ENDPOINTS_CHECKOUT',
        value: 'http://checkout:8080',
        description: 'Restore correct checkout endpoint',
      },
    ],
  },
  {
    id: 'ui-orders-disconnect',
    name: 'UI Orders History Disconnect',
    description: `UI cannot reach orders service. Order history pages fail,
but shopping and new checkout still work.`,
    category: 'subtle',
    steps: [
      {
        type: 'env',
        service: 'ui',
        variable: 'RETAIL_UI_ENDPOINTS_ORDERS',
        value: 'http://orders:9999',
        description: 'Point UI to wrong orders port',
      },
    ],
    recovery: [
      {
        type: 'env',
        service: 'ui',
        variable: 'RETAIL_UI_ENDPOINTS_ORDERS',
        value: 'http://orders:8080',
        description: 'Restore correct orders endpoint',
      },
    ],
  },
];
