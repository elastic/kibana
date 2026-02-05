/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DemoConfig, ServiceConfig } from '../../types';

const CONTAINER_REGISTRY = 'gcr.io/google-samples/microservices-demo';

/**
 * Google Online Boutique (microservices-demo) configuration
 * https://github.com/GoogleCloudPlatform/microservices-demo
 */
export const onlineBoutiqueConfig: DemoConfig = {
  id: 'online-boutique',
  displayName: 'Google Online Boutique',
  namespace: 'online-boutique',
  description: 'Google Cloud microservices demo - 11 services in Go, C#, Java, Python, Node.js',
  defaultVersion: 'v0.10.1',
  availableVersions: ['v0.10.1', 'v0.9.0', 'v0.8.0'],

  frontendService: {
    name: 'frontend',
    nodePort: 30080,
  },

  getServices: (version = 'v0.10.1'): ServiceConfig[] => [
    // Supporting services
    {
      name: 'redis-cart',
      image: 'redis:alpine',
      port: 6379,
    },

    // Demo microservices
    {
      name: 'emailservice',
      image: `${CONTAINER_REGISTRY}/emailservice:${version}`,
      port: 5000,
      env: {
        PORT: '5000',
        DISABLE_PROFILER: '1',
      },
    },
    {
      name: 'checkoutservice',
      image: `${CONTAINER_REGISTRY}/checkoutservice:${version}`,
      port: 5050,
      env: {
        PORT: '5050',
        PRODUCT_CATALOG_SERVICE_ADDR: 'productcatalogservice:3550',
        SHIPPING_SERVICE_ADDR: 'shippingservice:50051',
        PAYMENT_SERVICE_ADDR: 'paymentservice:50051',
        EMAIL_SERVICE_ADDR: 'emailservice:5000',
        CURRENCY_SERVICE_ADDR: 'currencyservice:7000',
        CART_SERVICE_ADDR: 'cartservice:7070',
      },
    },
    {
      name: 'recommendationservice',
      image: `${CONTAINER_REGISTRY}/recommendationservice:${version}`,
      port: 8080,
      env: {
        PORT: '8080',
        PRODUCT_CATALOG_SERVICE_ADDR: 'productcatalogservice:3550',
        DISABLE_PROFILER: '1',
      },
    },
    {
      name: 'frontend',
      image: `${CONTAINER_REGISTRY}/frontend:${version}`,
      port: 8080,
      env: {
        PORT: '8080',
        PRODUCT_CATALOG_SERVICE_ADDR: 'productcatalogservice:3550',
        CURRENCY_SERVICE_ADDR: 'currencyservice:7000',
        CART_SERVICE_ADDR: 'cartservice:7070',
        RECOMMENDATION_SERVICE_ADDR: 'recommendationservice:8080',
        SHIPPING_SERVICE_ADDR: 'shippingservice:50051',
        CHECKOUT_SERVICE_ADDR: 'checkoutservice:5050',
        AD_SERVICE_ADDR: 'adservice:9555',
        SHOPPING_ASSISTANT_SERVICE_ADDR: 'shoppingassistantservice:80',
        DISABLE_PROFILER: '1',
      },
    },
    {
      name: 'paymentservice',
      image: `${CONTAINER_REGISTRY}/paymentservice:${version}`,
      port: 50051,
      env: {
        PORT: '50051',
        DISABLE_PROFILER: '1',
      },
    },
    {
      name: 'productcatalogservice',
      image: `${CONTAINER_REGISTRY}/productcatalogservice:${version}`,
      port: 3550,
      env: {
        PORT: '3550',
      },
    },
    {
      name: 'cartservice',
      image: `${CONTAINER_REGISTRY}/cartservice:${version}`,
      port: 7070,
      env: {
        REDIS_ADDR: 'redis-cart:6379',
      },
    },
    {
      name: 'loadgenerator',
      image: `${CONTAINER_REGISTRY}/loadgenerator:${version}`,
      env: {
        FRONTEND_ADDR: 'frontend:8080',
        USERS: '10',
      },
    },
    {
      name: 'currencyservice',
      image: `${CONTAINER_REGISTRY}/currencyservice:${version}`,
      port: 7000,
      env: {
        PORT: '7000',
        DISABLE_PROFILER: '1',
      },
    },
    {
      name: 'shippingservice',
      image: `${CONTAINER_REGISTRY}/shippingservice:${version}`,
      port: 50051,
      env: {
        PORT: '50051',
        DISABLE_PROFILER: '1',
      },
    },
    {
      name: 'adservice',
      image: `${CONTAINER_REGISTRY}/adservice:${version}`,
      port: 9555,
      env: {
        PORT: '9555',
      },
    },
  ],
};

/**
 * Default environment values for services (used for scenario reset)
 */
export const SERVICE_DEFAULTS: Record<string, Record<string, string>> = {
  cartservice: {
    REDIS_ADDR: 'redis-cart:6379',
  },
  checkoutservice: {
    PRODUCT_CATALOG_SERVICE_ADDR: 'productcatalogservice:3550',
    CURRENCY_SERVICE_ADDR: 'currencyservice:7000',
    PAYMENT_SERVICE_ADDR: 'paymentservice:50051',
  },
  frontend: {
    CURRENCY_SERVICE_ADDR: 'currencyservice:7000',
    PRODUCT_CATALOG_SERVICE_ADDR: 'productcatalogservice:3550',
  },
  loadgenerator: {
    USERS: '10',
  },
};
