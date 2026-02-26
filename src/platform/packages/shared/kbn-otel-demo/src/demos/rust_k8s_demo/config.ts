/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DemoConfig, ServiceConfig } from '../../types';

const CONTAINER_REGISTRY = 'ghcr.io/caulagi/rust-k8s-demo';

/**
 * Rust K8s Demo - Rust microservices with gRPC
 * https://github.com/caulagi/rust-k8s-demo
 *
 * WARNING: This demo requires custom-built container images that are NOT available in public registries.
 * See customImageInstructions below for build steps.
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
  customImageInstructions: `This demo requires building and pushing images to GHCR or using local images.
The project uses skaffold for local development. To build and push:
  1. Clone https://github.com/caulagi/rust-k8s-demo
  2. Run: make bootstrap
  3. Build images: skaffold build --default-repo=ghcr.io/<your-username>/rust-k8s-demo
  4. Push to your registry or load into minikube: minikube image load <image>`,

  frontendService: {
    name: 'frontendservice',
    nodePort: 30088,
  },

  getServices: (version = 'latest'): ServiceConfig[] => [
    // PostgreSQL database with quotations data
    {
      name: 'databaseservice',
      image: `${CONTAINER_REGISTRY}/databaseservice:${version}`,
      port: 5432,
      env: {
        POSTGRES_PASSWORD: 'postgres',
        POSTGRES_USER: 'postgres',
        POSTGRES_DB: 'quotations',
      },
      resources: {
        requests: { memory: '128Mi', cpu: '100m' },
        limits: { memory: '256Mi', cpu: '250m' },
      },
    },

    // gRPC quotation service that queries PostgreSQL
    {
      name: 'quotationservice',
      image: `${CONTAINER_REGISTRY}/quotationservice:${version}`,
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
      image: `${CONTAINER_REGISTRY}/frontendservice:${version}`,
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
