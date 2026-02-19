/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * SCENARIO: Field Discovery Test Data
 *
 * Story: An SRE investigates a payment processing incident. The get_index_info tool
 * helps them discover what data is available and drill down to specific fields.
 *
 * Drill-down demonstration:
 * 1. get-index-patterns → See data streams: logs, metrics, traces
 * 2. list-fields on metrics-system.cpu → Find system.cpu.* fields
 * 3. get-field-values on host.name → See hosts: payment-host-01, order-host-02
 * 4. get-field-values on message (text) → See log message samples
 *
 * Services:
 * - `payment-service` (production) - High latency issues
 * - `order-service` (production) - Downstream dependency
 * - `notification-service` (staging) - Healthy baseline
 *
 * Hosts:
 * - `payment-host-01` (AWS, us-east-1): 85% CPU, 90% Memory - stressed
 * - `order-host-02` (AWS, us-west-2): 45% CPU, 60% Memory - normal
 * - `notification-host-03` (GCP, europe-west1): 25% CPU, 40% Memory - healthy
 *
 * Field types covered:
 * - keyword: service.name, host.name, cloud.provider, log.level
 * - numeric: system.cpu.total.norm.pct, transaction.duration.us
 * - date: @timestamp
 * - boolean: event.ingested
 * - text: message (log messages with varied content)
 *
 * Run:
 * ```
 * node scripts/synthtrace \
 *   src/platform/packages/shared/kbn-synthtrace/src/scenarios/agent_builder/tools/get_index_info/field_discovery.ts \
 *   --from "now-15m" --to "now" --clean --workers=1
 * ```
 */

import type { ApmFields, InfraDocument, LogDocument, Timerange } from '@kbn/synthtrace-client';
import { apm, generateShortId, infra, log } from '@kbn/synthtrace-client';
import { createCliScenario } from '../../../../lib/utils/create_scenario';
import { withClient, type ScenarioReturnType } from '../../../../lib/utils/with_client';
import type { ApmSynthtraceEsClient } from '../../../../lib/apm/client/apm_synthtrace_es_client';
import type { InfraSynthtraceEsClient } from '../../../../lib/infra/infra_synthtrace_es_client';
import type { LogsSynthtraceEsClient } from '../../../../lib/logs/logs_synthtrace_es_client';

// =============================================================================
// CONFIGURATION - Realistic incident scenario data
// =============================================================================

interface ServiceConfig {
  name: string;
  environment: string;
  host: string;
  agentName: 'nodejs' | 'java' | 'go';
  errorRate: number; // 0-1, probability of errors
  avgLatencyMs: number;
}

interface HostConfig {
  name: string;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  cloudProvider: 'aws' | 'gcp';
  cloudRegion: string;
  k8sNamespace: string;
  k8sPodName: string;
}

const SERVICES: ServiceConfig[] = [
  {
    name: 'payment-service',
    environment: 'production',
    host: 'payment-host-01',
    agentName: 'nodejs',
    errorRate: 0.3, // High errors - incident
    avgLatencyMs: 2500,
  },
  {
    name: 'order-service',
    environment: 'production',
    host: 'order-host-02',
    agentName: 'java',
    errorRate: 0.1,
    avgLatencyMs: 150,
  },
  {
    name: 'notification-service',
    environment: 'staging',
    host: 'notification-host-03',
    agentName: 'go',
    errorRate: 0.02,
    avgLatencyMs: 50,
  },
];

const HOSTS: HostConfig[] = [
  {
    name: 'payment-host-01',
    cpuUsage: 0.85,
    memoryUsage: 0.92,
    diskUsage: 0.78,
    cloudProvider: 'aws',
    cloudRegion: 'us-east-1',
    k8sNamespace: 'production',
    k8sPodName: 'payment-pod-abc123',
  },
  {
    name: 'order-host-02',
    cpuUsage: 0.45,
    memoryUsage: 0.6,
    diskUsage: 0.35,
    cloudProvider: 'aws',
    cloudRegion: 'us-west-2',
    k8sNamespace: 'production',
    k8sPodName: 'order-pod-def456',
  },
  {
    name: 'notification-host-03',
    cpuUsage: 0.25,
    memoryUsage: 0.4,
    diskUsage: 0.2,
    cloudProvider: 'gcp',
    cloudRegion: 'europe-west1',
    k8sNamespace: 'staging',
    k8sPodName: 'notification-pod-ghi789',
  },
];

// Diverse log messages to demonstrate text field sampling
const LOG_TEMPLATES = {
  info: [
    'Request processed successfully for user {userId} in {duration}ms',
    'Payment transaction {txId} completed for amount ${amount}',
    'Order {orderId} shipped to customer {customerId}',
    'Cache hit for key {cacheKey}, returning cached response',
    'Health check passed: database={dbStatus}, redis={redisStatus}',
  ],
  warn: [
    'High latency detected: {endpoint} took {duration}ms (threshold: 500ms)',
    'Rate limit approaching for client {clientId}: {current}/{limit} requests',
    'Retry attempt {attempt}/3 for downstream service {service}',
    'Memory usage at {memPct}% - approaching threshold',
    'Connection pool exhausted, waiting for available connection',
  ],
  error: [
    'Payment failed for transaction {txId}: {errorCode} - {errorMessage}',
    'Database connection timeout after {timeout}ms to {dbHost}',
    'External API error from {service}: HTTP {statusCode} - {responseBody}',
    'Authentication failed for user {userId}: invalid credentials',
    'Circuit breaker OPEN for {service} after {failures} consecutive failures',
  ],
};

function generateLogMessage(level: 'info' | 'warn' | 'error'): string {
  const templates = LOG_TEMPLATES[level];
  const template = templates[Math.floor(Math.random() * templates.length)];

  // Replace placeholders with realistic values
  return template
    .replace('{userId}', `user-${Math.floor(Math.random() * 1000)}`)
    .replace('{txId}', `tx-${generateShortId()}`)
    .replace('{orderId}', `order-${Math.floor(Math.random() * 10000)}`)
    .replace('{customerId}', `cust-${Math.floor(Math.random() * 500)}`)
    .replace('{amount}', (Math.random() * 1000).toFixed(2))
    .replace('{duration}', String(Math.floor(Math.random() * 3000)))
    .replace(
      '{endpoint}',
      ['/api/payment', '/api/orders', '/api/users'][Math.floor(Math.random() * 3)]
    )
    .replace('{clientId}', `client-${Math.floor(Math.random() * 100)}`)
    .replace('{current}', String(Math.floor(Math.random() * 900) + 100))
    .replace('{limit}', '1000')
    .replace('{attempt}', String(Math.floor(Math.random() * 3) + 1))
    .replace(
      '{service}',
      ['payment-gateway', 'inventory-api', 'shipping-service'][Math.floor(Math.random() * 3)]
    )
    .replace('{memPct}', String(Math.floor(Math.random() * 20) + 80))
    .replace(
      '{cacheKey}',
      `cache:${['user', 'product', 'session'][Math.floor(Math.random() * 3)]}:${generateShortId()}`
    )
    .replace('{dbStatus}', 'healthy')
    .replace('{redisStatus}', 'healthy')
    .replace('{errorCode}', ['DECLINED', 'TIMEOUT', 'INVALID_CARD'][Math.floor(Math.random() * 3)])
    .replace('{errorMessage}', 'Transaction could not be processed')
    .replace('{timeout}', String(Math.floor(Math.random() * 5000) + 5000))
    .replace('{dbHost}', 'db-primary.internal')
    .replace('{statusCode}', ['500', '502', '503', '504'][Math.floor(Math.random() * 4)])
    .replace('{responseBody}', 'Service temporarily unavailable')
    .replace('{failures}', String(Math.floor(Math.random() * 5) + 5));
}

// =============================================================================
// GENERATORS - Reusable for API tests
// =============================================================================

export interface FieldDiscoveryDataParams {
  range: Timerange;
  infraEsClient: InfraSynthtraceEsClient;
  apmEsClient: ApmSynthtraceEsClient;
  logsEsClient: LogsSynthtraceEsClient;
  hosts?: HostConfig[];
  services?: ServiceConfig[];
}

/**
 * Generates comprehensive observability data for testing get_index_info.
 * Exports reusable function for API integration tests.
 */
export function generateFieldDiscoveryData({
  range,
  infraEsClient,
  apmEsClient,
  logsEsClient,
  hosts = HOSTS,
  services = SERVICES,
}: FieldDiscoveryDataParams): Array<ScenarioReturnType<InfraDocument | ApmFields | LogDocument>> {
  // =========================================================================
  // INFRASTRUCTURE METRICS (metrics-system.*)
  // =========================================================================
  const infraData = range
    .interval('30s')
    .rate(1)
    .generator((timestamp) =>
      hosts.flatMap((hostConfig) => {
        const host = infra.host(hostConfig.name);
        const totalMemory = 68_719_476_736; // 64GB
        const usedMemory = Math.floor(totalMemory * hostConfig.memoryUsage);

        const baseOverrides = {
          'agent.id': 'synthtrace-field-discovery',
          'host.name': hostConfig.name,
          'host.hostname': hostConfig.name,
          'host.architecture': 'x86_64',
          'cloud.provider': hostConfig.cloudProvider,
          'cloud.region': hostConfig.cloudRegion,
          'kubernetes.namespace': hostConfig.k8sNamespace,
          'kubernetes.pod.name': hostConfig.k8sPodName,
        };

        return [
          host
            .cpu({ 'system.cpu.total.norm.pct': hostConfig.cpuUsage })
            .overrides({ ...baseOverrides, 'data_stream.dataset': 'system.cpu' })
            .timestamp(timestamp),
          host
            .memory({
              'system.memory.actual.free': totalMemory - usedMemory,
              'system.memory.actual.used.bytes': usedMemory,
              'system.memory.actual.used.pct': hostConfig.memoryUsage,
              'system.memory.total': totalMemory,
            })
            .overrides({ ...baseOverrides, 'data_stream.dataset': 'system.memory' })
            .timestamp(timestamp),
          host
            .filesystem({ 'system.filesystem.used.pct': hostConfig.diskUsage })
            .overrides({ ...baseOverrides, 'data_stream.dataset': 'system.filesystem' })
            .timestamp(timestamp),
          host
            .load()
            .overrides({ ...baseOverrides, 'data_stream.dataset': 'system.load' })
            .timestamp(timestamp),
          host
            .network()
            .overrides({ ...baseOverrides, 'data_stream.dataset': 'system.network' })
            .timestamp(timestamp),
        ];
      })
    );

  // =========================================================================
  // APM TRACES (traces-apm-*)
  // =========================================================================
  const apmData = range
    .interval('5s')
    .rate(3)
    .generator((timestamp) =>
      services.flatMap((serviceConfig) => {
        const hostConfig = hosts.find((h) => h.name === serviceConfig.host)!;
        const isError = Math.random() < serviceConfig.errorRate;
        const latency = serviceConfig.avgLatencyMs * (0.5 + Math.random());

        const instance = apm
          .service({
            name: serviceConfig.name,
            environment: serviceConfig.environment,
            agentName: serviceConfig.agentName,
          })
          .instance(`${serviceConfig.name}-instance`)
          .defaults({
            'host.name': hostConfig.name,
            'cloud.provider': hostConfig.cloudProvider,
            'cloud.region': hostConfig.cloudRegion,
            'kubernetes.namespace': hostConfig.k8sNamespace,
          });

        const endpoints = [
          'GET /api/health',
          'POST /api/payment',
          'GET /api/orders',
          'POST /api/checkout',
        ];
        const transactionName = endpoints[Math.floor(Math.random() * endpoints.length)];

        const transaction = instance
          .transaction({ transactionName })
          .timestamp(timestamp)
          .duration(latency);

        if (isError) {
          return [
            transaction.failure().defaults({ 'http.response.status_code': 500 }),
            instance
              .error({
                message: `Error in ${transactionName}: Connection timeout`,
                type: 'TimeoutError',
              })
              .timestamp(timestamp),
          ];
        }

        return [
          transaction
            .success()
            .defaults({ 'http.response.status_code': 200 })
            .children(
              instance
                .span({
                  spanName: 'SELECT * FROM orders',
                  spanType: 'db',
                  spanSubtype: 'postgresql',
                })
                .duration(latency * 0.4)
                .success()
                .timestamp(timestamp)
            ),
        ];
      })
    );

  // =========================================================================
  // LOGS (logs-generic-*)
  // Includes diverse text messages for text field sampling tests
  // =========================================================================
  const logsData = range
    .interval('3s')
    .rate(2)
    .generator((timestamp) => {
      const serviceConfig = services[Math.floor(Math.random() * services.length)];
      const hostConfig = hosts.find((h) => h.name === serviceConfig.host)!;

      // Weight log levels based on service error rate
      const rand = Math.random();
      const level: 'info' | 'warn' | 'error' =
        rand < serviceConfig.errorRate
          ? 'error'
          : rand < serviceConfig.errorRate + 0.2
          ? 'warn'
          : 'info';

      const message = generateLogMessage(level);

      return log
        .create()
        .dataset('generic')
        .namespace(serviceConfig.environment)
        .message(message)
        .logLevel(level)
        .service(serviceConfig.name)
        .hostName(hostConfig.name)
        .containerId(`container-${hostConfig.name}`)
        .defaults({
          'service.environment': serviceConfig.environment,
          'cloud.provider': hostConfig.cloudProvider,
          'cloud.region': hostConfig.cloudRegion,
          'kubernetes.namespace': hostConfig.k8sNamespace,
          'kubernetes.pod.name': hostConfig.k8sPodName,
          'trace.id': generateShortId(),
          'agent.name': 'filebeat',
        })
        .timestamp(timestamp);
    });

  return [
    withClient(infraEsClient, infraData),
    withClient(apmEsClient, apmData),
    withClient(logsEsClient, logsData),
  ];
}

// =============================================================================
// CLI SCENARIO
// =============================================================================

export default createCliScenario(
  ({ range, clients: { infraEsClient, apmEsClient, logsEsClient } }) => {
    return generateFieldDiscoveryData({
      range,
      infraEsClient,
      apmEsClient,
      logsEsClient,
    });
  }
);
