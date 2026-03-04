/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DemoConfig, ServiceConfig } from '../../types';

const CONTAINER_REGISTRY = 'rust-k8s-demo';

/**
 * Rust K8s Demo - Rust microservices with gRPC
 * https://github.com/caulagi/rust-k8s-demo
 *
 * Images are built automatically from source using minikube image build.
 *
 * Architecture:
 * - frontendservice: HTTP server (port 8080) that returns quotations
 * - quotationservice: gRPC server (port 9001) that queries the database for quotations
 * - databaseservice: PostgreSQL (port 5432) initialized with quotation data
 */
export const rustK8sDemoConfig: DemoConfig = {
  id: 'rust-k8s-demo',
  displayName: 'Rust K8s Demo',
  namespace: 'rust-k8s-demo',
  description:
    'Rust microservices demo with gRPC communication - frontend, quotation service, and PostgreSQL',
  defaultVersion: 'latest',
  availableVersions: ['latest'],
  requiresCustomImages: true,
  customImageInstructions: `Images will be built automatically from source.
The first deployment may take several minutes while Rust compiles the services.`,
  imageBuildConfig: {
    gitUrl: 'https://github.com/caulagi/rust-k8s-demo.git',
    images: [
      { name: 'rust-k8s-demo/frontendservice:latest', context: 'frontendservice' },
      { name: 'rust-k8s-demo/quotationservice:latest', context: 'quotationservice' },
      { name: 'rust-k8s-demo/databaseservice:latest', context: 'databaseservice' },
    ],
  },

  frontendService: {
    name: 'frontendservice',
    nodePort: 30088,
  },

  getServices: (): ServiceConfig[] => [
    // PostgreSQL database with quotations data
    {
      name: 'databaseservice',
      image: `${CONTAINER_REGISTRY}/databaseservice:latest`,
      port: 5432,
      env: {
        POSTGRES_PASSWORD: 'postgres',
        POSTGRES_USER: 'postgres',
      },
      resources: {
        requests: { memory: '128Mi', cpu: '100m' },
        limits: { memory: '256Mi', cpu: '250m' },
      },
    },

    // gRPC quotation service that queries PostgreSQL
    {
      name: 'quotationservice',
      image: `${CONTAINER_REGISTRY}/quotationservice:latest`,
      port: 9001,
      env: {
        RUST_LOG: 'quotation_server=debug,tower_http=trace',
        POSTGRES_PASSWORD: 'postgres',
        POSTGRES_SERVICE: 'databaseservice',
        OTEL_EXPORTER_OTLP_ENDPOINT: 'http://otel-collector:4317',
        OTEL_SERVICE_NAME: 'quotationservice',
        OTEL_TRACES_EXPORTER: 'otlp',
        OTEL_METRICS_EXPORTER: 'otlp',
      },
      resources: {
        requests: { memory: '180Mi', cpu: '200m' },
        limits: { memory: '300Mi', cpu: '300m' },
      },
    },

    // Frontend HTTP service
    {
      name: 'frontendservice',
      image: `${CONTAINER_REGISTRY}/frontendservice:latest`,
      port: 8080,
      env: {
        QUOTATION_SERVICE_HOSTNAME: 'quotationservice',
        RUST_LOG: 'frontend_server=debug,tower_http=trace',
        OTEL_EXPORTER_OTLP_ENDPOINT: 'http://otel-collector:4317',
        OTEL_SERVICE_NAME: 'frontendservice',
        OTEL_TRACES_EXPORTER: 'otlp',
        OTEL_METRICS_EXPORTER: 'otlp',
      },
      resources: {
        requests: { memory: '64Mi', cpu: '100m' },
        limits: { memory: '128Mi', cpu: '200m' },
      },
    },

    // Load generator - fetches quotations periodically
    {
      name: 'load-generator',
      image: 'curlimages/curl:8.5.0',
      command: ['/bin/sh', '-c'],
      args: [
        `while true; do for i in 1 2 3 4 5; do curl -s -o /dev/null http://frontendservice:8080/ || true; sleep 0.3; done; sleep 0.5; done`,
      ],
      resources: {
        requests: { memory: '32Mi', cpu: '50m' },
        limits: { memory: '64Mi', cpu: '100m' },
      },
    },
  ],
};

/**
 * Default environment values for services (used for scenario reset)
 */
export const SERVICE_DEFAULTS: Record<string, Record<string, string>> = {
  frontendservice: {
    QUOTATION_SERVICE_HOSTNAME: 'quotationservice',
  },
  quotationservice: {
    POSTGRES_SERVICE: 'databaseservice',
  },
};
