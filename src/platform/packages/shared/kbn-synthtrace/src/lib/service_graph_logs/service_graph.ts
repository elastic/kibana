/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ServiceGraph, ServiceEdge, ServiceNode } from './types';

const CORE_SERVICES = [
  {
    name: 'claim-intake',
    runtime: 'node',
    infraDeps: ['kafka', 'postgres'],
    version: '1.0.0',
    deployment: {
      k8s: {
        namespace: 'claims',
      },
      os: {
        type: 'linux',
        name: 'Debian GNU/Linux',
        version: '12 (bookworm)',
      },
    },
    serviceLogs: {
      success: ['Claim intake successful', 'Claim intake completed'],
      error: [
        'Failed to persist claim to database: connection timeout',
        'Claim validation failed: missing required field "policy_id"',
        'Unhandled error in claim pipeline: request processing aborted',
      ],
    },
  } as const,
  {
    name: 'policy-lookup',
    runtime: 'java',
    infraDeps: ['postgres', 'redis'],
    version: '1.0.0',
    deployment: {
      k8s: {
        namespace: 'claims',
      },
    },
  } as const,
  {
    name: 'fraud-check',
    runtime: 'python',
    infraDeps: ['elasticsearch', 'mongodb'],
    version: '1.0.0',
    deployment: {
      k8s: {
        namespace: 'claims',
      },
    },
    serviceLogs: {
      success: [
        'Fraud check passed',
        'No fraud detected',
        'Risk score evaluated: insufficient transaction history, defaulting to manual review',
      ],
      error: [
        'Fraud detection model timeout: upstream scoring service unavailable',
        'Fraud check failed: scoring pipeline returned unexpected error',
      ],
    },
  } as const,
  {
    name: 'payment-processor',
    runtime: 'go',
    infraDeps: ['kafka', 'postgres'],
    version: '1.0.0',
    deployment: {
      k8s: {
        namespace: 'payments',
      },
    },
    serviceLogs: {
      success: ['Payment processed successfully', 'Payment completed'],
      error: [
        'Payment gateway rejected transaction: insufficient funds',
        'Duplicate payment detected: idempotency key already used',
        'Payment processing failed: downstream acquirer timeout after 30s',
        'Payment persistence failed: database transaction rolled back after timeout',
        'Event publish failed: unable to reach Kafka broker after 3 retries',
      ],
    },
  } as const,
  {
    name: 'notification-dispatch',
    runtime: 'node',
    infraDeps: ['kafka', 'redis'],
    version: '1.0.0',
    deployment: {
      k8s: {
        namespace: 'notifications',
      },
    },
  } as const,
] satisfies ServiceNode[];

const CORE_EDGES = [
  { source: 'claim-intake', target: 'policy-lookup', protocol: 'http' },
  { source: 'claim-intake', target: 'fraud-check', protocol: 'http' },
  { source: 'fraud-check', target: 'policy-lookup', protocol: 'grpc' },
  { source: 'fraud-check', target: 'payment-processor', protocol: 'kafka' },
  { source: 'payment-processor', target: 'notification-dispatch', protocol: 'kafka' },
] satisfies ServiceEdge[];

export const DEFAULT_SERVICE_GRAPH = {
  edges: CORE_EDGES,
  services: CORE_SERVICES,
} satisfies ServiceGraph;
