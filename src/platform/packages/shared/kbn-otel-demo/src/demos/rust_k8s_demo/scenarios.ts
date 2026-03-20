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
 * Failure scenarios for Rust K8s Demo.
 * These simulate real-world misconfigurations and failures in a Rust microservices system.
 */
export const RUST_K8S_DEMO_SCENARIOS: FailureScenario[] = [
  // ============ DRAMATIC FAILURES ============
  {
    id: 'quotation-service-unreachable',
    name: 'Quotation Service Unreachable',
    description: `Frontend cannot reach the quotation gRPC service. All quotation requests fail,
and users see errors when trying to get new quotations from the frontend.`,
    category: 'dramatic',
    steps: [
      {
        type: 'env',
        service: 'frontendservice',
        variable: 'QUOTATION_SERVICE_HOSTNAME',
        value: 'quotationservice-invalid',
        description: 'Point frontend to invalid quotation service hostname',
      },
    ],
    recovery: [
      {
        type: 'env',
        service: 'frontendservice',
        variable: 'QUOTATION_SERVICE_HOSTNAME',
        value: 'quotationservice',
        description: 'Restore quotation service hostname',
      },
    ],
  },
  {
    id: 'database-unreachable',
    name: 'Database Unreachable',
    description: `Quotation service cannot connect to PostgreSQL. All database queries fail,
causing the quotation service to return errors and the frontend to show failures.`,
    category: 'dramatic',
    steps: [
      {
        type: 'env',
        service: 'quotationservice',
        variable: 'POSTGRES_SERVICE',
        value: 'databaseservice-invalid',
        description: 'Point quotation service to invalid database hostname',
      },
    ],
    recovery: [
      {
        type: 'env',
        service: 'quotationservice',
        variable: 'POSTGRES_SERVICE',
        value: 'databaseservice',
        description: 'Restore database hostname',
      },
    ],
  },
  {
    id: 'database-wrong-password',
    name: 'Database Wrong Password',
    description: `Quotation service has incorrect PostgreSQL password. Authentication fails,
all queries are rejected, and no quotations can be retrieved.`,
    category: 'dramatic',
    steps: [
      {
        type: 'env',
        service: 'quotationservice',
        variable: 'POSTGRES_PASSWORD',
        value: 'wrong-password',
        description: 'Set incorrect database password',
      },
    ],
    recovery: [
      {
        type: 'env',
        service: 'quotationservice',
        variable: 'POSTGRES_PASSWORD',
        value: 'postgres',
        description: 'Restore correct database password',
      },
    ],
  },

  // ============ SUBTLE FAILURES ============
  {
    id: 'debug-logging-disabled',
    name: 'Debug Logging Disabled',
    description: `All debug logging is disabled across services. The system functions normally
but troubleshooting becomes harder as detailed logs are missing.`,
    category: 'subtle',
    steps: [
      {
        type: 'env',
        service: 'frontendservice',
        variable: 'RUST_LOG',
        value: 'error',
        description: 'Set frontend to only log errors',
      },
      {
        type: 'env',
        service: 'quotationservice',
        variable: 'RUST_LOG',
        value: 'error',
        description: 'Set quotation service to only log errors',
      },
    ],
    recovery: [
      {
        type: 'env',
        service: 'frontendservice',
        variable: 'RUST_LOG',
        value: 'frontend_server=debug,tower_http=trace',
        description: 'Restore frontend debug logging',
      },
      {
        type: 'env',
        service: 'quotationservice',
        variable: 'RUST_LOG',
        value: 'quotation_server=debug,tower_http=trace',
        description: 'Restore quotation service debug logging',
      },
    ],
  },
  {
    id: 'otel-collector-wrong-endpoint',
    name: 'OTEL Collector Wrong Endpoint',
    description: `Services have incorrect OTEL collector endpoint. Traces and metrics are lost
but the application continues to function. Observability is degraded.`,
    category: 'subtle',
    steps: [
      {
        type: 'env',
        service: 'frontendservice',
        variable: 'OTEL_EXPORTER_OTLP_ENDPOINT',
        value: 'http://otel-collector:9999',
        description: 'Point frontend to wrong collector port',
      },
      {
        type: 'env',
        service: 'quotationservice',
        variable: 'OTEL_EXPORTER_OTLP_ENDPOINT',
        value: 'http://otel-collector:9999',
        description: 'Point quotation service to wrong collector port',
      },
    ],
    recovery: [
      {
        type: 'env',
        service: 'frontendservice',
        variable: 'OTEL_EXPORTER_OTLP_ENDPOINT',
        value: 'http://otel-collector:4317',
        description: 'Restore frontend collector endpoint',
      },
      {
        type: 'env',
        service: 'quotationservice',
        variable: 'OTEL_EXPORTER_OTLP_ENDPOINT',
        value: 'http://otel-collector:4317',
        description: 'Restore quotation service collector endpoint',
      },
    ],
  },
  {
    id: 'partial-grpc-failure',
    name: 'Partial gRPC Failure',
    description: `Frontend has a slightly misconfigured quotation service hostname with a typo.
Depending on DNS resolution behavior, requests may intermittently fail or take longer.`,
    category: 'subtle',
    steps: [
      {
        type: 'env',
        service: 'frontendservice',
        variable: 'QUOTATION_SERVICE_HOSTNAME',
        value: 'quotationservice.',
        description: 'Add trailing dot to hostname (may cause DNS issues)',
      },
    ],
    recovery: [
      {
        type: 'env',
        service: 'frontendservice',
        variable: 'QUOTATION_SERVICE_HOSTNAME',
        value: 'quotationservice',
        description: 'Restore correct hostname',
      },
    ],
  },
];
