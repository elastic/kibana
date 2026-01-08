/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * SCENARIO: Curated Fields Discovery
 *
 * Story: Generates comprehensive observability data (logs, traces, metrics) to test
 * the get_index_info() call signature that returns curated observability fields.
 *
 * This scenario covers all major field categories from the CURATED_OBSERVABILITY_FIELDS:
 * - dimensions: service.name, host.name, kubernetes.*, cloud.*, container.*
 * - metrics: system.cpu.*, system.memory.*, transaction.duration.us
 * - text: message, error.message
 * - correlation: trace.id, span.id, transaction.id
 * - severity: log.level
 * - timestamp: @timestamp
 *
 * Services:
 * - `payment-service` (production) on host-01
 * - `order-service` (staging) on host-02
 * - `auth-service` (development) on host-03
 *
 * Infrastructure:
 * - 3 hosts across AWS and GCP
 * - Kubernetes pods in `production` and `staging` namespaces
 *
 * Run:
 * ```
 * node scripts/synthtrace \
 *   src/platform/packages/shared/kbn-synthtrace/src/scenarios/agent_builder/tools/get_index_info/curated_fields.ts \
 *   --from "now-15m" --to "now" --clean --workers=1
 * ```
 *
 * Validate via:
 * ```
 * POST kbn:///api/agent_builder/tools/_execute
 * {
 *   "tool_id": "observability.get_index_info",
 *   "tool_params": {}
 * }
 * ```
 *
 * Expected: Returns curated fields organized by category with schemas indicating ECS data.
 */

import type { ApmFields, InfraDocument, LogDocument } from '@kbn/synthtrace-client';
import { apm, generateShortId, infra, log } from '@kbn/synthtrace-client';
import type { Scenario } from '../../../../cli/scenario';
import { withClient } from '../../../../lib/utils/with_client';

// Service configurations
const SERVICES = [
  {
    name: 'payment-service',
    environment: 'production',
    host: 'discover-host-01',
    agentName: 'nodejs' as const,
  },
  {
    name: 'order-service',
    environment: 'staging',
    host: 'discover-host-02',
    agentName: 'java' as const,
  },
  {
    name: 'auth-service',
    environment: 'development',
    host: 'discover-host-03',
    agentName: 'go' as const,
  },
];

// Host configurations with cloud and kubernetes metadata
const HOSTS = [
  {
    name: 'discover-host-01',
    cpuUsage: 0.65,
    memoryUsage: 0.72,
    diskUsage: 0.45,
    cloud: { provider: 'aws', region: 'us-east-1', availabilityZone: 'us-east-1a' },
    kubernetes: {
      namespace: 'production',
      podName: 'payment-pod-abc123',
      nodeName: 'k8s-node-01',
      deploymentName: 'payment-deployment',
    },
  },
  {
    name: 'discover-host-02',
    cpuUsage: 0.35,
    memoryUsage: 0.55,
    diskUsage: 0.3,
    cloud: { provider: 'gcp', region: 'us-central1', availabilityZone: 'us-central1-a' },
    kubernetes: {
      namespace: 'staging',
      podName: 'order-pod-def456',
      nodeName: 'k8s-node-02',
      deploymentName: 'order-deployment',
    },
  },
  {
    name: 'discover-host-03',
    cpuUsage: 0.25,
    memoryUsage: 0.4,
    diskUsage: 0.2,
    cloud: { provider: 'aws', region: 'eu-west-1', availabilityZone: 'eu-west-1a' },
    kubernetes: {
      namespace: 'development',
      podName: 'auth-pod-ghi789',
      nodeName: 'k8s-node-03',
      deploymentName: 'auth-deployment',
    },
  },
];

const LOG_MESSAGES = [
  { level: 'info', message: 'Request processed successfully' },
  { level: 'info', message: 'User authenticated' },
  { level: 'warn', message: 'High latency detected on database query' },
  { level: 'warn', message: 'Rate limit approaching threshold' },
  { level: 'error', message: 'Connection refused to downstream service' },
  { level: 'error', message: 'Database connection timeout' },
  { level: 'debug', message: 'Processing batch job' },
];

const TRANSACTION_NAMES = [
  'GET /api/health',
  'POST /api/payment',
  'GET /api/orders',
  'POST /api/auth/login',
  'GET /api/users/:id',
];

const scenario: Scenario<LogDocument | InfraDocument | ApmFields> = async (runOptions) => {
  return {
    generate: ({ range, clients: { logsEsClient, infraEsClient, apmEsClient } }) => {
      const { logger } = runOptions;

      // =======================================================================
      // INFRASTRUCTURE METRICS (metrics-*)
      // Covers: system.cpu.*, system.memory.*, system.filesystem.*, host.*, cloud.*
      // =======================================================================
      const infraData = range
        .interval('30s')
        .rate(1)
        .generator((timestamp) =>
          HOSTS.flatMap((hostConfig) => {
            const host = infra.host(hostConfig.name);
            const totalMemory = 68_719_476_736; // 64GB
            const usedMemory = Math.floor(totalMemory * hostConfig.memoryUsage);

            const baseOverrides = {
              'agent.id': 'synthtrace',
              'agent.name': 'metricbeat',
              'host.name': hostConfig.name,
              'host.hostname': hostConfig.name,
              'host.architecture': 'x86_64',
              'host.os.name': 'Ubuntu',
              'cloud.provider': hostConfig.cloud.provider,
              'cloud.region': hostConfig.cloud.region,
              'cloud.availability_zone': hostConfig.cloud.availabilityZone,
              'cloud.account.id': '123456789012',
              'container.id': `container-${hostConfig.name}`,
              'container.name': `${hostConfig.kubernetes.deploymentName}-container`,
              'kubernetes.namespace': hostConfig.kubernetes.namespace,
              'kubernetes.pod.name': hostConfig.kubernetes.podName,
              'kubernetes.pod.uid': generateShortId(),
              'kubernetes.node.name': hostConfig.kubernetes.nodeName,
              'kubernetes.deployment.name': hostConfig.kubernetes.deploymentName,
            };

            return [
              host
                .cpu({ 'system.cpu.total.norm.pct': hostConfig.cpuUsage })
                .overrides({
                  ...baseOverrides,
                  'event.dataset': 'system.cpu',
                  'data_stream.dataset': 'system.cpu',
                })
                .timestamp(timestamp),
              host
                .memory({
                  'system.memory.actual.free': totalMemory - usedMemory,
                  'system.memory.actual.used.bytes': usedMemory,
                  'system.memory.actual.used.pct': hostConfig.memoryUsage,
                  'system.memory.total': totalMemory,
                })
                .overrides({
                  ...baseOverrides,
                  'event.dataset': 'system.memory',
                  'data_stream.dataset': 'system.memory',
                })
                .timestamp(timestamp),
              host
                .filesystem({ 'system.filesystem.used.pct': hostConfig.diskUsage })
                .overrides({
                  ...baseOverrides,
                  'event.dataset': 'system.filesystem',
                  'data_stream.dataset': 'system.filesystem',
                })
                .timestamp(timestamp),
              host
                .load()
                .overrides({
                  ...baseOverrides,
                  'event.dataset': 'system.load',
                  'data_stream.dataset': 'system.load',
                })
                .timestamp(timestamp),
              host
                .network()
                .overrides({
                  ...baseOverrides,
                  'event.dataset': 'system.network',
                  'data_stream.dataset': 'system.network',
                })
                .timestamp(timestamp),
            ];
          })
        );

      // =======================================================================
      // APM TRACES (traces-apm-*)
      // Covers: service.*, transaction.*, span.*, trace.id, http.*, event.outcome
      // =======================================================================
      const apmData = range
        .interval('10s')
        .rate(3)
        .generator((timestamp) =>
          SERVICES.flatMap((serviceConfig) => {
            const hostConfig = HOSTS.find((h) => h.name === serviceConfig.host)!;

            const instance = apm
              .service({
                name: serviceConfig.name,
                environment: serviceConfig.environment,
                agentName: serviceConfig.agentName,
              })
              .instance(`${serviceConfig.name}-instance`)
              .defaults({
                'host.name': hostConfig.name,
                'service.version': '1.2.3',
                'service.node.name': `${serviceConfig.name}-node-1`,
                'cloud.provider': hostConfig.cloud.provider,
                'cloud.region': hostConfig.cloud.region,
                'kubernetes.namespace': hostConfig.kubernetes.namespace,
                'kubernetes.pod.name': hostConfig.kubernetes.podName,
              });

            const transactionName =
              TRANSACTION_NAMES[Math.floor(Math.random() * TRANSACTION_NAMES.length)];
            const isError = Math.random() < 0.2;
            const duration = isError ? 2000 + Math.random() * 3000 : 50 + Math.random() * 200;

            // Transaction with spans
            const transaction = instance
              .transaction({ transactionName })
              .timestamp(timestamp)
              .duration(duration)
              .defaults({
                'http.request.method': transactionName.split(' ')[0],
                'url.path': transactionName.split(' ')[1],
              });

            if (isError) {
              return [
                transaction.failure().defaults({ 'http.response.status_code': 500 }),
                instance
                  .error({
                    message: 'Connection refused to downstream service',
                    type: 'ConnectionError',
                  })
                  .timestamp(timestamp),
              ];
            }

            // Successful transaction with child spans
            return [
              transaction
                .success()
                .defaults({ 'http.response.status_code': 200 })
                .children(
                  instance
                    .span({
                      spanName: 'SELECT * FROM users',
                      spanType: 'db',
                      spanSubtype: 'postgresql',
                    })
                    .duration(duration * 0.3)
                    .success()
                    .timestamp(timestamp)
                ),
            ];
          })
        );

      // =======================================================================
      // LOGS (logs-*)
      // Covers: message, log.level, service.name, host.name, trace.id, container.*
      // =======================================================================
      const logsData = range
        .interval('5s')
        .rate(2)
        .generator((timestamp) => {
          const serviceConfig = SERVICES[Math.floor(Math.random() * SERVICES.length)];
          const hostConfig = HOSTS.find((h) => h.name === serviceConfig.host)!;
          const logEntry = LOG_MESSAGES[Math.floor(Math.random() * LOG_MESSAGES.length)];
          const traceId = generateShortId();

          return log
            .create()
            .dataset('generic')
            .namespace(serviceConfig.environment)
            .message(logEntry.message)
            .logLevel(logEntry.level)
            .service(serviceConfig.name)
            .hostName(hostConfig.name)
            .containerId(`container-${hostConfig.name}`)
            .defaults({
              'service.environment': serviceConfig.environment,
              'service.version': '1.2.3',
              'host.architecture': 'x86_64',
              'host.os.name': 'Ubuntu',
              'cloud.provider': hostConfig.cloud.provider,
              'cloud.region': hostConfig.cloud.region,
              'cloud.availability_zone': hostConfig.cloud.availabilityZone,
              'container.name': `${hostConfig.kubernetes.deploymentName}-container`,
              'kubernetes.namespace': hostConfig.kubernetes.namespace,
              'kubernetes.pod.name': hostConfig.kubernetes.podName,
              'kubernetes.node.name': hostConfig.kubernetes.nodeName,
              'trace.id': traceId,
              'agent.name': 'filebeat',
              'log.file.path': `/var/log/${serviceConfig.name}/app.log`,
            })
            .timestamp(timestamp);
        });

      return [
        withClient(
          infraEsClient,
          logger.perf('generating_infra_metrics', () => infraData)
        ),
        withClient(
          apmEsClient,
          logger.perf('generating_apm_traces', () => apmData)
        ),
        withClient(
          logsEsClient,
          logger.perf('generating_logs', () => logsData)
        ),
      ];
    },
  };
};

export default scenario;
