/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DemoConfig, ServiceConfig } from '../../types';

const CONTAINER_REGISTRY = 'us-central1-docker.pkg.dev/bank-of-anthos-ci/bank-of-anthos';

/**
 * Bank of Anthos configuration
 * https://github.com/GoogleCloudPlatform/bank-of-anthos
 */
export const bankOfAnthosConfig: DemoConfig = {
  id: 'bank-of-anthos',
  displayName: 'Bank of Anthos',
  namespace: 'bank-of-anthos',
  description:
    'Google Cloud banking demo - Python frontend, Java Spring Boot backend services with PostgreSQL',
  defaultVersion: 'v0.6.8',
  availableVersions: ['v0.6.8', 'v0.6.7', 'v0.6.6'],

  frontendService: {
    name: 'frontend',
    nodePort: 30081,
  },

  getServices: (version = 'v0.6.8'): ServiceConfig[] => [
    // PostgreSQL databases (StatefulSets in the real deployment, simplified here)
    {
      name: 'accounts-db',
      image: `${CONTAINER_REGISTRY}/accounts-db:${version}`,
      port: 5432,
      env: {
        POSTGRES_DB: 'accounts-db',
        POSTGRES_USER: 'accounts-admin',
        POSTGRES_PASSWORD: 'accounts-pwd',
        ACCOUNTS_DB_URI: 'postgresql://accounts-admin:accounts-pwd@accounts-db:5432/accounts-db',
        LOCAL_ROUTING_NUM: '883745000',
        PUB_KEY_PATH: '/tmp/.ssh/publickey',
        USE_DEMO_DATA: 'True',
        DEMO_LOGIN_USERNAME: 'testuser',
        DEMO_LOGIN_PASSWORD: 'bankofanthos',
      },
    },
    {
      name: 'ledger-db',
      image: `${CONTAINER_REGISTRY}/ledger-db:${version}`,
      port: 5432,
      env: {
        POSTGRES_DB: 'postgresdb',
        POSTGRES_USER: 'admin',
        POSTGRES_PASSWORD: 'password',
        SPRING_DATASOURCE_URL: 'jdbc:postgresql://ledger-db:5432/postgresdb',
        SPRING_DATASOURCE_USERNAME: 'admin',
        SPRING_DATASOURCE_PASSWORD: 'password',
        LOCAL_ROUTING_NUM: '883745000',
        PUB_KEY_PATH: '/tmp/.ssh/publickey',
        USE_DEMO_DATA: 'True',
        DEMO_LOGIN_USERNAME: 'testuser',
        DEMO_LOGIN_PASSWORD: 'bankofanthos',
      },
    },

    // Backend services - Accounts team
    {
      name: 'userservice',
      image: `${CONTAINER_REGISTRY}/userservice:${version}`,
      port: 8080,
      env: {
        VERSION: version,
        PORT: '8080',
        ENABLE_TRACING: 'false',
        ENABLE_METRICS: 'false',
        TOKEN_EXPIRY_SECONDS: '3600',
        PRIV_KEY_PATH: '/tmp/.ssh/privatekey',
        LOG_LEVEL: 'info',
        ACCOUNTS_DB_URI: 'postgresql://accounts-admin:accounts-pwd@accounts-db:5432/accounts-db',
        LOCAL_ROUTING_NUM: '883745000',
        PUB_KEY_PATH: '/tmp/.ssh/publickey',
        OTEL_EXPORTER_OTLP_ENDPOINT: 'http://otel-collector:4317',
        OTEL_SERVICE_NAME: 'userservice',
      },
    },
    {
      name: 'contacts',
      image: `${CONTAINER_REGISTRY}/contacts:${version}`,
      port: 8080,
      env: {
        VERSION: version,
        PORT: '8080',
        ENABLE_TRACING: 'false',
        ENABLE_METRICS: 'false',
        LOG_LEVEL: 'info',
        ACCOUNTS_DB_URI: 'postgresql://accounts-admin:accounts-pwd@accounts-db:5432/accounts-db',
        LOCAL_ROUTING_NUM: '883745000',
        PUB_KEY_PATH: '/tmp/.ssh/publickey',
        OTEL_EXPORTER_OTLP_ENDPOINT: 'http://otel-collector:4317',
        OTEL_SERVICE_NAME: 'contacts',
      },
    },

    // Backend services - Ledger team
    {
      name: 'ledgerwriter',
      image: `${CONTAINER_REGISTRY}/ledgerwriter:${version}`,
      port: 8080,
      env: {
        VERSION: version,
        PORT: '8080',
        ENABLE_TRACING: 'false',
        ENABLE_METRICS: 'false',
        JVM_OPTS:
          '-XX:+UnlockExperimentalVMOptions -XX:+UseCGroupMemoryLimitForHeap -Xms256m -Xmx512m',
        LOG_LEVEL: 'info',
        SPRING_DATASOURCE_URL: 'jdbc:postgresql://ledger-db:5432/postgresdb',
        SPRING_DATASOURCE_USERNAME: 'admin',
        SPRING_DATASOURCE_PASSWORD: 'password',
        LOCAL_ROUTING_NUM: '883745000',
        PUB_KEY_PATH: '/tmp/.ssh/publickey',
        BALANCES_API_ADDR: 'balancereader:8080',
        OTEL_EXPORTER_OTLP_ENDPOINT: 'http://otel-collector:4317',
        OTEL_SERVICE_NAME: 'ledgerwriter',
      },
    },
    {
      name: 'balancereader',
      image: `${CONTAINER_REGISTRY}/balancereader:${version}`,
      port: 8080,
      env: {
        VERSION: version,
        PORT: '8080',
        ENABLE_TRACING: 'false',
        ENABLE_METRICS: 'false',
        POLL_MS: '100',
        CACHE_SIZE: '1000000',
        JVM_OPTS:
          '-XX:+UnlockExperimentalVMOptions -XX:+UseCGroupMemoryLimitForHeap -Xms256m -Xmx512m',
        LOG_LEVEL: 'info',
        SPRING_DATASOURCE_URL: 'jdbc:postgresql://ledger-db:5432/postgresdb',
        SPRING_DATASOURCE_USERNAME: 'admin',
        SPRING_DATASOURCE_PASSWORD: 'password',
        LOCAL_ROUTING_NUM: '883745000',
        PUB_KEY_PATH: '/tmp/.ssh/publickey',
        OTEL_EXPORTER_OTLP_ENDPOINT: 'http://otel-collector:4317',
        OTEL_SERVICE_NAME: 'balancereader',
      },
    },
    {
      name: 'transactionhistory',
      image: `${CONTAINER_REGISTRY}/transactionhistory:${version}`,
      port: 8080,
      env: {
        VERSION: version,
        PORT: '8080',
        ENABLE_TRACING: 'false',
        ENABLE_METRICS: 'false',
        POLL_MS: '100',
        CACHE_SIZE: '1000',
        CACHE_MINUTES: '60',
        HISTORY_LIMIT: '100',
        JVM_OPTS:
          '-XX:+UnlockExperimentalVMOptions -XX:+UseCGroupMemoryLimitForHeap -Xms256m -Xmx512m',
        LOG_LEVEL: 'info',
        SPRING_DATASOURCE_URL: 'jdbc:postgresql://ledger-db:5432/postgresdb',
        SPRING_DATASOURCE_USERNAME: 'admin',
        SPRING_DATASOURCE_PASSWORD: 'password',
        LOCAL_ROUTING_NUM: '883745000',
        PUB_KEY_PATH: '/tmp/.ssh/publickey',
        OTEL_EXPORTER_OTLP_ENDPOINT: 'http://otel-collector:4317',
        OTEL_SERVICE_NAME: 'transactionhistory',
      },
    },

    // Frontend
    {
      name: 'frontend',
      image: `${CONTAINER_REGISTRY}/frontend:${version}`,
      port: 8080,
      env: {
        VERSION: version,
        PORT: '8080',
        ENABLE_TRACING: 'false',
        ENABLE_METRICS: 'false',
        SCHEME: 'http',
        LOG_LEVEL: 'info',
        DEFAULT_USERNAME: 'testuser',
        DEFAULT_PASSWORD: 'bankofanthos',
        TRANSACTIONS_API_ADDR: 'ledgerwriter:8080',
        BALANCES_API_ADDR: 'balancereader:8080',
        HISTORY_API_ADDR: 'transactionhistory:8080',
        CONTACTS_API_ADDR: 'contacts:8080',
        USERSERVICE_API_ADDR: 'userservice:8080',
        LOCAL_ROUTING_NUM: '883745000',
        PUB_KEY_PATH: '/tmp/.ssh/publickey',
        OTEL_EXPORTER_OTLP_ENDPOINT: 'http://otel-collector:4317',
        OTEL_SERVICE_NAME: 'frontend',
      },
    },

    // Load generator
    {
      name: 'loadgenerator',
      image: `${CONTAINER_REGISTRY}/loadgenerator:${version}`,
      env: {
        FRONTEND_ADDR: 'frontend:8080',
        USERS: '5',
        LOG_LEVEL: 'error',
      },
    },
  ],
};

/**
 * Default environment values for services (used for scenario reset)
 */
export const SERVICE_DEFAULTS: Record<string, Record<string, string>> = {
  frontend: {
    TRANSACTIONS_API_ADDR: 'ledgerwriter:8080',
    BALANCES_API_ADDR: 'balancereader:8080',
    HISTORY_API_ADDR: 'transactionhistory:8080',
    CONTACTS_API_ADDR: 'contacts:8080',
    USERSERVICE_API_ADDR: 'userservice:8080',
  },
  ledgerwriter: {
    BALANCES_API_ADDR: 'balancereader:8080',
    SPRING_DATASOURCE_URL: 'jdbc:postgresql://ledger-db:5432/postgresdb',
  },
  balancereader: {
    SPRING_DATASOURCE_URL: 'jdbc:postgresql://ledger-db:5432/postgresdb',
  },
  transactionhistory: {
    SPRING_DATASOURCE_URL: 'jdbc:postgresql://ledger-db:5432/postgresdb',
  },
  userservice: {
    ACCOUNTS_DB_URI: 'postgresql://accounts-admin:accounts-pwd@accounts-db:5432/accounts-db',
  },
  contacts: {
    ACCOUNTS_DB_URI: 'postgresql://accounts-admin:accounts-pwd@accounts-db:5432/accounts-db',
  },
  loadgenerator: {
    USERS: '5',
  },
};
