/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DemoConfig, ServiceConfig } from '../../types';

const CONTAINER_REGISTRY = 'ghcr.io/teamlead/kubepay';

/**
 * KubePay - Spring Boot microservices financial demo
 * https://github.com/teamlead/spring-microservices-kubernetes-demo
 *
 * Note: This demo requires building and pushing images to GHCR or using local images.
 * See the KubePay repo for build instructions: ./mvnw clean install -DskipTests
 * Then build Docker images:
 *   docker build -t ghcr.io/teamlead/kubepay/gateway:latest ./gateway/gateway-service
 *   docker build -t ghcr.io/teamlead/kubepay/auth:latest ./auth/auth-service
 *   docker build -t ghcr.io/teamlead/kubepay/user:latest ./user/user-service
 *   docker build -t ghcr.io/teamlead/kubepay/wallet:latest ./wallet/wallet-service
 */
export const kubepayConfig: DemoConfig = {
  id: 'kubepay',
  displayName: 'KubePay Financial Demo',
  namespace: 'kubepay',
  description:
    'Spring Boot 3 microservices demo for user registration, balance top-up, and fund transfers with Zipkin tracing',
  defaultVersion: 'latest',
  availableVersions: ['latest'],

  frontendService: {
    name: 'gateway',
    nodePort: 30086,
  },

  getServices: (version = 'latest'): ServiceConfig[] => [
    // Zipkin for distributed tracing (required by KubePay)
    {
      name: 'zipkin',
      image: 'openzipkin/zipkin:latest',
      port: 9411,
      resources: {
        requests: { memory: '256Mi', cpu: '100m' },
        limits: { memory: '512Mi', cpu: '500m' },
      },
    },

    // Gateway - API gateway and entry point
    {
      name: 'gateway',
      image: `${CONTAINER_REGISTRY}/gateway:${version}`,
      port: 8100,
      env: {
        AUTH_URL: 'http://auth:8101',
        USER_URL: 'http://user:8102',
        WALLET_URL: 'http://wallet:8103',
        BILLING_URL: 'http://gateway:8100/billing/test',
        STANDALONE: 'false',
        TRACING: 'true',
        ZIPKIN_ENDPOINT: 'http://zipkin:9411/api/v2/spans',
        OTEL_EXPORTER_OTLP_ENDPOINT: 'http://otel-collector:4317',
        OTEL_SERVICE_NAME: 'gateway',
        OTEL_TRACES_EXPORTER: 'otlp',
        OTEL_METRICS_EXPORTER: 'otlp',
        OTEL_LOGS_EXPORTER: 'otlp',
      },
      resources: {
        requests: { memory: '256Mi', cpu: '100m' },
        limits: { memory: '512Mi', cpu: '500m' },
      },
    },

    // Auth service - handles authentication and authorization
    {
      name: 'auth',
      image: `${CONTAINER_REGISTRY}/auth:${version}`,
      port: 8101,
      env: {
        AUTH_URL: 'http://auth:8101',
        USER_URL: 'http://user:8102',
        WALLET_URL: 'http://wallet:8103',
        BILLING_URL: 'http://gateway:8100/billing/test',
        STANDALONE: 'false',
        TRACING: 'true',
        ZIPKIN_ENDPOINT: 'http://zipkin:9411/api/v2/spans',
        OTEL_EXPORTER_OTLP_ENDPOINT: 'http://otel-collector:4317',
        OTEL_SERVICE_NAME: 'auth',
        OTEL_TRACES_EXPORTER: 'otlp',
        OTEL_METRICS_EXPORTER: 'otlp',
        OTEL_LOGS_EXPORTER: 'otlp',
      },
      resources: {
        requests: { memory: '256Mi', cpu: '100m' },
        limits: { memory: '512Mi', cpu: '500m' },
      },
    },

    // User service - handles user operations
    {
      name: 'user',
      image: `${CONTAINER_REGISTRY}/user:${version}`,
      port: 8102,
      env: {
        AUTH_URL: 'http://auth:8101',
        USER_URL: 'http://user:8102',
        WALLET_URL: 'http://wallet:8103',
        BILLING_URL: 'http://gateway:8100/billing/test',
        STANDALONE: 'false',
        TRACING: 'true',
        ZIPKIN_ENDPOINT: 'http://zipkin:9411/api/v2/spans',
        OTEL_EXPORTER_OTLP_ENDPOINT: 'http://otel-collector:4317',
        OTEL_SERVICE_NAME: 'user',
        OTEL_TRACES_EXPORTER: 'otlp',
        OTEL_METRICS_EXPORTER: 'otlp',
        OTEL_LOGS_EXPORTER: 'otlp',
      },
      resources: {
        requests: { memory: '256Mi', cpu: '100m' },
        limits: { memory: '512Mi', cpu: '500m' },
      },
    },

    // Wallet service - handles wallet and fund operations
    {
      name: 'wallet',
      image: `${CONTAINER_REGISTRY}/wallet:${version}`,
      port: 8103,
      env: {
        AUTH_URL: 'http://auth:8101',
        USER_URL: 'http://user:8102',
        WALLET_URL: 'http://wallet:8103',
        BILLING_URL: 'http://gateway:8100/billing/test',
        STANDALONE: 'false',
        TRACING: 'true',
        ZIPKIN_ENDPOINT: 'http://zipkin:9411/api/v2/spans',
        OTEL_EXPORTER_OTLP_ENDPOINT: 'http://otel-collector:4317',
        OTEL_SERVICE_NAME: 'wallet',
        OTEL_TRACES_EXPORTER: 'otlp',
        OTEL_METRICS_EXPORTER: 'otlp',
        OTEL_LOGS_EXPORTER: 'otlp',
      },
      resources: {
        requests: { memory: '256Mi', cpu: '100m' },
        limits: { memory: '512Mi', cpu: '500m' },
      },
    },
  ],
};

/**
 * Default environment values for services (used for scenario reset)
 */
export const SERVICE_DEFAULTS: Record<string, Record<string, string>> = {
  gateway: {
    AUTH_URL: 'http://auth:8101',
    USER_URL: 'http://user:8102',
    WALLET_URL: 'http://wallet:8103',
  },
  auth: {
    USER_URL: 'http://user:8102',
  },
  user: {
    AUTH_URL: 'http://auth:8101',
    WALLET_URL: 'http://wallet:8103',
  },
  wallet: {
    AUTH_URL: 'http://auth:8101',
    USER_URL: 'http://user:8102',
  },
};
