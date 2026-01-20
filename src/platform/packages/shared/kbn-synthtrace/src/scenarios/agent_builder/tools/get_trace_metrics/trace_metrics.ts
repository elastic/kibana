/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * SCENARIO: Generated Trace Metrics
 *
 * Story: Generates APM transaction data across multiple services with different hosts,
 * containers, Kubernetes pods, environments, and failure rates to verify the `get_trace_metrics`
 * tool and its filtering/grouping capabilities.
 *
 * Services:
 * - `payment-service` (production, host-01, container-payment-001, k8s pod)
 *   - POST /api/payment (10% failure rate)
 *   - GET /api/payment/status (0% failure rate)
 * - `user-service` (production, host-01, container-user-001, k8s pod)
 *   - GET /api/user (5% failure rate)
 *   - page-load (2% failure rate)
 * - `order-service` (staging, host-02, container-order-001, k8s pod)
 *   - POST /api/order (20% failure rate)
 *   - worker-process (15% failure rate)
 * - `notification-service` (staging, host-02, container-notify-001, k8s pod)
 *   - send-notification (30% failure rate)
 *
 * Validate via:
 *
 * ```
 * POST kbn:///api/agent_builder/tools/_execute
 * {
 *   "tool_id": "observability.get_trace_metrics",
 *   "tool_params": {
 *     "start": "now-1h",
 *     "end": "now"
 *   }
 * }
 * ```
 */

import type { ApmFields, Serializable, Timerange } from '@kbn/synthtrace-client';
import { apm } from '@kbn/synthtrace-client';
import { createCliScenario } from '../../../../lib/utils/create_scenario';
import { withClient, type ScenarioReturnType } from '../../../../lib/utils/with_client';
import type { ApmSynthtraceEsClient } from '../../../../lib/apm/client/apm_synthtrace_es_client';

/**
 * Configuration for a transaction within a service
 */
export interface TraceMetricsTransactionConfig {
  name: string;
  type: string;
  duration: number;
  failureRate: number;
  /** Custom labels to add to this specific transaction */
  labels?: Record<string, string>;
}

/**
 * Configuration for a service to generate trace metrics
 */
export interface TraceMetricsServiceConfig {
  name: string;
  environment: string;
  hostName: string;
  containerId?: string;
  kubernetesPodName?: string;
  transactions: TraceMetricsTransactionConfig[];
  /** Custom labels to add to all transactions for this service */
  labels?: Record<string, string>;
}

/**
 * Generates APM transaction data for trace metrics testing.
 * Can be used both by CLI (via default export) and by API tests (via direct import).
 */
export function generateTraceMetricsData({
  range,
  apmEsClient,
  services,
}: {
  range: Timerange;
  apmEsClient: ApmSynthtraceEsClient;
  services: TraceMetricsServiceConfig[];
}): ScenarioReturnType<ApmFields> {
  const data = range
    .interval('1m')
    .rate(10)
    .generator((timestamp) =>
      services.flatMap((serviceConfig) => {
        // Build overrides object with host.name and optional container.id/kubernetes.pod.name
        const overrides: Record<string, string | undefined> = {
          'host.name': serviceConfig.hostName,
        };

        if (serviceConfig.containerId) {
          overrides['container.id'] = serviceConfig.containerId;
        }

        if (serviceConfig.kubernetesPodName) {
          overrides['kubernetes.pod.name'] = serviceConfig.kubernetesPodName;
        }

        if (serviceConfig.labels) {
          for (const [key, value] of Object.entries(serviceConfig.labels)) {
            overrides[`labels.${key}`] = value;
          }
        }

        const instance = apm
          .service({
            name: serviceConfig.name,
            environment: serviceConfig.environment,
            agentName: 'nodejs',
          })
          .instance(`${serviceConfig.name}-instance`)
          .overrides(overrides);

        return serviceConfig.transactions.flatMap((txConfig) => {
          const transactions: Array<Serializable<ApmFields>> = [];

          const txOverrides: Record<string, string> = {};
          if (txConfig.labels) {
            for (const [key, value] of Object.entries(txConfig.labels)) {
              txOverrides[`labels.${key}`] = value;
            }
          }

          // Create successful transactions
          const successCount = Math.round(10 * (1 - txConfig.failureRate));
          for (let i = 0; i < successCount; i++) {
            let tx = instance
              .transaction({ transactionName: txConfig.name, transactionType: txConfig.type })
              .timestamp(timestamp)
              .duration(txConfig.duration)
              .success();

            if (Object.keys(txOverrides).length > 0) {
              tx = tx.overrides(txOverrides);
            }

            transactions.push(tx);
          }

          // Create failed transactions
          const failureCount = Math.round(10 * txConfig.failureRate);
          for (let i = 0; i < failureCount; i++) {
            let tx = instance
              .transaction({ transactionName: txConfig.name, transactionType: txConfig.type })
              .timestamp(timestamp)
              .duration(txConfig.duration * 1.5)
              .failure();

            if (Object.keys(txOverrides).length > 0) {
              tx = tx.overrides(txOverrides);
            }

            transactions.push(tx);
          }

          return transactions;
        });
      })
    );

  return withClient(apmEsClient, data);
}

export default createCliScenario(({ range, clients: { apmEsClient } }) => {
  const services: TraceMetricsServiceConfig[] = [
    // Service 1: payment-service in production on host-01 with container, k8s pod, and labels
    {
      name: 'payment-service',
      environment: 'production',
      hostName: 'host-01',
      containerId: 'container-payment-001',
      kubernetesPodName: 'payment-service-pod-abc123',
      labels: { team: 'payments', tier: 'critical' },
      transactions: [
        {
          name: 'POST /api/payment',
          type: 'request',
          duration: 200,
          failureRate: 0.1, // 10% failure rate
          labels: { endpoint: 'payment-create' },
        },
        {
          name: 'GET /api/payment/status',
          type: 'request',
          duration: 50,
          failureRate: 0.0, // No failures
          labels: { endpoint: 'payment-status' },
        },
      ],
    },
    // Service 2: user-service in production on host-01 with k8s pod and labels
    {
      name: 'user-service',
      environment: 'production',
      hostName: 'host-01',
      containerId: 'container-user-001',
      kubernetesPodName: 'user-service-pod-def456',
      labels: { team: 'identity', tier: 'critical' },
      transactions: [
        {
          name: 'GET /api/user',
          type: 'request',
          duration: 100,
          failureRate: 0.05, // 5% failure rate
        },
        {
          name: 'page-load',
          type: 'page-load',
          duration: 1000,
          failureRate: 0.02, // 2% failure rate
        },
      ],
    },
    // Service 3: order-service in staging on host-02 with container, k8s pod, and labels
    {
      name: 'order-service',
      environment: 'staging',
      hostName: 'host-02',
      containerId: 'container-order-001',
      kubernetesPodName: 'order-service-pod-ghi789',
      labels: { team: 'orders', tier: 'standard' },
      transactions: [
        {
          name: 'POST /api/order',
          type: 'request',
          duration: 300,
          failureRate: 0.2, // 20% failure rate
        },
        {
          name: 'worker-process',
          type: 'worker',
          duration: 500,
          failureRate: 0.15, // 15% failure rate
        },
      ],
    },
    // Service 4: notification-service in staging on host-02 with k8s pod and labels
    {
      name: 'notification-service',
      environment: 'staging',
      hostName: 'host-02',
      containerId: 'container-notify-001',
      kubernetesPodName: 'notification-service-pod-jkl012',
      labels: { team: 'notifications', tier: 'standard' },
      transactions: [
        {
          name: 'send-notification',
          type: 'messaging',
          duration: 150,
          failureRate: 0.3, // 30% failure rate
        },
      ],
    },
  ];

  return generateTraceMetricsData({ range, apmEsClient, services });
});
