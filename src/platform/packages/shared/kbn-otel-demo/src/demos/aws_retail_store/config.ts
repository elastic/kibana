/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DemoConfig, ServiceConfig } from '../../types';

const CONTAINER_REGISTRY = 'public.ecr.aws/aws-containers';

/**
 * AWS Retail Store Sample configuration
 * https://github.com/aws-containers/retail-store-sample-app
 */
export const awsRetailStoreConfig: DemoConfig = {
  id: 'aws-retail-store',
  displayName: 'AWS Retail Store Sample',
  namespace: 'aws-retail-store',
  description:
    'AWS containers demo - Java UI, Go catalog, Java cart/orders, Node checkout with MySQL, DynamoDB, Redis',
  defaultVersion: '1.0.0',
  availableVersions: ['1.0.0', '0.9.0', '0.8.0'],

  frontendService: {
    name: 'ui',
    nodePort: 30085,
  },

  getServices: (version = '1.0.0'): ServiceConfig[] => [
    // Database services
    {
      name: 'catalog-db',
      image: 'mariadb:10.11',
      port: 3306,
      env: {
        MARIADB_ROOT_PASSWORD: 'catalog_password',
        MARIADB_DATABASE: 'catalogdb',
        MARIADB_USER: 'catalog_user',
        MARIADB_PASSWORD: 'catalog_password',
      },
      resources: {
        requests: { memory: '256Mi', cpu: '100m' },
        limits: { memory: '512Mi', cpu: '500m' },
      },
    },
    {
      name: 'orders-db',
      image: 'postgres:15-alpine',
      port: 5432,
      env: {
        POSTGRES_DB: 'orders',
        POSTGRES_USER: 'orders_user',
        POSTGRES_PASSWORD: 'orders_password',
      },
      resources: {
        requests: { memory: '256Mi', cpu: '100m' },
        limits: { memory: '512Mi', cpu: '500m' },
      },
    },
    {
      name: 'checkout-redis',
      image: 'redis:7-alpine',
      port: 6379,
      resources: {
        requests: { memory: '64Mi', cpu: '50m' },
        limits: { memory: '128Mi', cpu: '200m' },
      },
    },
    {
      name: 'carts-dynamodb',
      image: 'amazon/dynamodb-local:latest',
      port: 8000,
      env: {
        DEFAULT_REGION: 'us-east-1',
      },
      resources: {
        requests: { memory: '256Mi', cpu: '100m' },
        limits: { memory: '512Mi', cpu: '500m' },
      },
    },

    // Application services
    {
      name: 'catalog',
      image: `${CONTAINER_REGISTRY}/retail-store-sample-catalog:${version}`,
      port: 8080,
      env: {
        PORT: '8080',
        RETAIL_CATALOG_PERSISTENCE_PROVIDER: 'mysql',
        RETAIL_CATALOG_PERSISTENCE_ENDPOINT: 'catalog-db:3306',
        RETAIL_CATALOG_PERSISTENCE_DB_NAME: 'catalogdb',
        RETAIL_CATALOG_PERSISTENCE_USER: 'catalog_user',
        RETAIL_CATALOG_PERSISTENCE_PASSWORD: 'catalog_password',
        OTEL_EXPORTER_OTLP_ENDPOINT: 'http://otel-collector:4318',
        OTEL_SERVICE_NAME: 'catalog',
      },
      resources: {
        requests: { memory: '64Mi', cpu: '50m' },
        limits: { memory: '256Mi', cpu: '250m' },
      },
    },
    {
      name: 'cart',
      image: `${CONTAINER_REGISTRY}/retail-store-sample-cart:${version}`,
      port: 8080,
      env: {
        PORT: '8080',
        RETAIL_CART_PERSISTENCE_PROVIDER: 'dynamodb',
        RETAIL_CART_PERSISTENCE_DYNAMODB_ENDPOINT: 'http://carts-dynamodb:8000',
        RETAIL_CART_PERSISTENCE_DYNAMODB_TABLE_NAME: 'Items',
        RETAIL_CART_PERSISTENCE_DYNAMODB_CREATE_TABLE: 'true',
        AWS_ACCESS_KEY_ID: 'dummy',
        AWS_SECRET_ACCESS_KEY: 'dummy',
        AWS_REGION: 'us-east-1',
        OTEL_EXPORTER_OTLP_ENDPOINT: 'http://otel-collector:4318',
        OTEL_SERVICE_NAME: 'cart',
      },
      resources: {
        requests: { memory: '256Mi', cpu: '100m' },
        limits: { memory: '512Mi', cpu: '500m' },
      },
    },
    {
      name: 'orders',
      image: `${CONTAINER_REGISTRY}/retail-store-sample-orders:${version}`,
      port: 8080,
      env: {
        PORT: '8080',
        RETAIL_ORDERS_PERSISTENCE_PROVIDER: 'postgres',
        RETAIL_ORDERS_PERSISTENCE_ENDPOINT: 'orders-db:5432',
        RETAIL_ORDERS_PERSISTENCE_NAME: 'orders',
        RETAIL_ORDERS_PERSISTENCE_USERNAME: 'orders_user',
        RETAIL_ORDERS_PERSISTENCE_PASSWORD: 'orders_password',
        OTEL_EXPORTER_OTLP_ENDPOINT: 'http://otel-collector:4318',
        OTEL_SERVICE_NAME: 'orders',
      },
      resources: {
        requests: { memory: '256Mi', cpu: '100m' },
        limits: { memory: '512Mi', cpu: '500m' },
      },
    },
    {
      name: 'checkout',
      image: `${CONTAINER_REGISTRY}/retail-store-sample-checkout:${version}`,
      port: 8080,
      env: {
        PORT: '8080',
        RETAIL_CHECKOUT_PERSISTENCE_PROVIDER: 'redis',
        RETAIL_CHECKOUT_PERSISTENCE_REDIS_URL: 'redis://checkout-redis:6379',
        RETAIL_CHECKOUT_ENDPOINTS_ORDERS: 'http://orders:8080',
        OTEL_EXPORTER_OTLP_ENDPOINT: 'http://otel-collector:4318',
        OTEL_SERVICE_NAME: 'checkout',
      },
      resources: {
        requests: { memory: '128Mi', cpu: '50m' },
        limits: { memory: '256Mi', cpu: '250m' },
      },
    },

    // UI / Frontend
    {
      name: 'ui',
      image: `${CONTAINER_REGISTRY}/retail-store-sample-ui:${version}`,
      port: 8080,
      env: {
        PORT: '8080',
        RETAIL_UI_ENDPOINTS_CATALOG: 'http://catalog:8080',
        RETAIL_UI_ENDPOINTS_CARTS: 'http://cart:8080',
        RETAIL_UI_ENDPOINTS_ORDERS: 'http://orders:8080',
        RETAIL_UI_ENDPOINTS_CHECKOUT: 'http://checkout:8080',
        OTEL_EXPORTER_OTLP_ENDPOINT: 'http://otel-collector:4318',
        OTEL_SERVICE_NAME: 'ui',
      },
      resources: {
        requests: { memory: '256Mi', cpu: '100m' },
        limits: { memory: '512Mi', cpu: '500m' },
      },
    },

    // Load generator - simulates shopping activity
    {
      name: 'load-generator',
      image: 'curlimages/curl:8.5.0',
      command: ['/bin/sh', '-c'],
      args: [
        `while true; do
          COOKIES=/tmp/cookies_$$;
          rm -f $COOKIES;
          curl -s -o /dev/null -b $COOKIES -c $COOKIES http://ui:8080/home || true;
          sleep 1;
          curl -s -o /dev/null -b $COOKIES -c $COOKIES http://ui:8080/catalog || true;
          sleep 1;
          PRODUCTS=$(curl -s http://catalog:8080/catalogue | grep -o '"id":"[^"]*"' | head -5 | cut -d'"' -f4 || echo "");
          for PROD in $PRODUCTS; do
            curl -s -o /dev/null -b $COOKIES -c $COOKIES "http://ui:8080/catalog/$PROD" || true;
            sleep 0.5;
          done;
          FIRST_PROD=$(echo "$PRODUCTS" | head -1);
          if [ -n "$FIRST_PROD" ]; then
            curl -s -o /dev/null -b $COOKIES -c $COOKIES -X POST http://ui:8080/cart -d "productId=$FIRST_PROD" || true;
          fi;
          sleep 1;
          curl -s -o /dev/null -b $COOKIES -c $COOKIES http://ui:8080/cart || true;
          sleep 2;
          curl -s -o /dev/null -b $COOKIES -c $COOKIES http://ui:8080/checkout || true;
          sleep 1;
          curl -s -o /dev/null -b $COOKIES -c $COOKIES -X POST http://ui:8080/checkout -d "firstName=Test&lastName=User&email=test@example.com&streetAddress=123 Main St&city=Testville&state=CA&zipCode=12345" || true;
          sleep 2;
          rm -f $COOKIES;
        done`,
      ],
      env: {
        OTEL_SERVICE_NAME: 'load-generator',
      },
      resources: {
        requests: { memory: '32Mi', cpu: '25m' },
        limits: { memory: '64Mi', cpu: '100m' },
      },
    },
  ],
};

/**
 * Default environment values for services (used for scenario reset)
 */
export const SERVICE_DEFAULTS: Record<string, Record<string, string>> = {
  ui: {
    RETAIL_UI_ENDPOINTS_CATALOG: 'http://catalog:8080',
    RETAIL_UI_ENDPOINTS_CARTS: 'http://cart:8080',
    RETAIL_UI_ENDPOINTS_ORDERS: 'http://orders:8080',
    RETAIL_UI_ENDPOINTS_CHECKOUT: 'http://checkout:8080',
  },
  catalog: {
    RETAIL_CATALOG_PERSISTENCE_ENDPOINT: 'catalog-db:3306',
  },
  cart: {
    RETAIL_CART_PERSISTENCE_DYNAMODB_ENDPOINT: 'http://carts-dynamodb:8000',
  },
  orders: {
    RETAIL_ORDERS_PERSISTENCE_ENDPOINT: 'orders-db:5432',
  },
  checkout: {
    RETAIL_CHECKOUT_PERSISTENCE_REDIS_URL: 'redis://checkout-redis:6379',
    RETAIL_CHECKOUT_ENDPOINTS_ORDERS: 'http://orders:8080',
  },
  'load-generator': {},
};
