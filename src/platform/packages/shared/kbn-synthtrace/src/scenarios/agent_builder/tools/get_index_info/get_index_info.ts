/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * SCENARIO: Get Index Info Test Data
 *
 * Story: Generates comprehensive observability data to test the get_index_info tool.
 * Includes infrastructure metrics, APM traces, and logs with various field types.
 *
 * Hosts:
 * - `discover-host-01` (AWS, us-east-1): 65% CPU, 72% Memory
 *   - Services: `payment-service` (production), `user-service` (staging)
 *
 * - `discover-host-02` (GCP, us-central1): 35% CPU, 85% Memory
 *   - Services: `order-service` (production)
 *
 * Kubernetes:
 * - Pod: `payment-pod-abc123` in namespace `production`
 * - Node: `k8s-node-01`
 *
 * This generates data with many ECS fields for the get_index_info tool to find.
 *
 * Run:
 * ```
 * node scripts/synthtrace \
 *   src/platform/packages/shared/kbn-synthtrace/src/scenarios/agent_builder/tools/get_index_info/get_index_info.ts \
 *   --from "now-15m" --to "now" --clean --workers=1
 * ```
 *
 * Validate via:
 *
 * ```
 * POST kbn:///api/agent_builder/tools/_execute
 * {
 *   "tool_id": "observability.get_index_info",
 *   "tool_params": {}
 * }
 * ```
 */

import type { ApmFields, InfraDocument, Timerange } from '@kbn/synthtrace-client';
import { apm, infra } from '@kbn/synthtrace-client';
import { createCliScenario } from '../../../../lib/utils/create_scenario';
import { withClient, type ScenarioReturnType } from '../../../../lib/utils/with_client';
import type { ApmSynthtraceEsClient } from '../../../../lib/apm/client/apm_synthtrace_es_client';
import type { InfraSynthtraceEsClient } from '../../../../lib/infra/infra_synthtrace_es_client';

interface HostConfig {
  name: string;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  cloudProvider: string;
  cloudRegion: string;
  services?: Array<{ name: string; environment: string }>;
}

/**
 * Generates comprehensive observability data for testing field discovery.
 */
export function generateGetIndexInfoData({
  range,
  infraEsClient,
  apmEsClient,
  hosts,
}: {
  range: Timerange;
  infraEsClient: InfraSynthtraceEsClient;
  apmEsClient: ApmSynthtraceEsClient;
  hosts: HostConfig[];
}): Array<ScenarioReturnType<InfraDocument | ApmFields>> {
  // Generate infrastructure metrics
  const infraData = range
    .interval('30s')
    .rate(1)
    .generator((timestamp) =>
      hosts.flatMap((hostConfig) => {
        const host = infra.host(hostConfig.name);
        const totalMemory = 68_719_476_736; // 64GB
        const usedMemory = Math.floor(totalMemory * hostConfig.memoryUsage);

        const baseOverrides = {
          'agent.id': 'synthtrace',
          'host.name': hostConfig.name,
          'host.hostname': hostConfig.name,
          'cloud.provider': hostConfig.cloudProvider,
          'cloud.region': hostConfig.cloudRegion,
        };

        const cpuOverrides = {
          ...baseOverrides,
          'event.dataset': 'system.cpu',
          'data_stream.dataset': 'system.cpu',
        };
        const memoryOverrides = {
          ...baseOverrides,
          'event.dataset': 'system.memory',
          'data_stream.dataset': 'system.memory',
        };
        const networkOverrides = {
          ...baseOverrides,
          'event.dataset': 'system.network',
          'data_stream.dataset': 'system.network',
        };
        const loadOverrides = {
          ...baseOverrides,
          'event.dataset': 'system.load',
          'data_stream.dataset': 'system.load',
        };
        const fsOverrides = {
          ...baseOverrides,
          'event.dataset': 'system.filesystem',
          'data_stream.dataset': 'system.filesystem',
        };
        const diskioOverrides = {
          ...baseOverrides,
          'event.dataset': 'system.diskio',
          'data_stream.dataset': 'system.diskio',
        };

        return [
          host
            .cpu({ 'system.cpu.total.norm.pct': hostConfig.cpuUsage })
            .overrides(cpuOverrides)
            .timestamp(timestamp),
          host
            .memory({
              'system.memory.actual.free': totalMemory - usedMemory,
              'system.memory.actual.used.bytes': usedMemory,
              'system.memory.actual.used.pct': hostConfig.memoryUsage,
              'system.memory.total': totalMemory,
            })
            .overrides(memoryOverrides)
            .timestamp(timestamp),
          host.network().overrides(networkOverrides).timestamp(timestamp),
          host.load().overrides(loadOverrides).timestamp(timestamp),
          host
            .filesystem({ 'system.filesystem.used.pct': hostConfig.diskUsage })
            .overrides(fsOverrides)
            .timestamp(timestamp),
          host.diskio().overrides(diskioOverrides).timestamp(timestamp),
        ];
      })
    );

  // Generate APM data with various transaction types and error conditions
  const apmData = range
    .interval('1m')
    .rate(5)
    .generator((timestamp) =>
      hosts.flatMap((hostConfig) =>
        (hostConfig.services ?? []).flatMap((serviceConfig) => {
          const instance = apm
            .service({
              name: serviceConfig.name,
              environment: serviceConfig.environment,
              agentName: 'nodejs',
            })
            .instance(`${serviceConfig.name}-instance`)
            .overrides({ 'host.name': hostConfig.name });

          // Generate successful transactions
          const successTx = instance
            .transaction({ transactionName: 'GET /api/health' })
            .timestamp(timestamp)
            .duration(100)
            .success();

          // Generate some failed transactions for error discovery
          const failedTx = instance
            .transaction({ transactionName: 'POST /api/payment' })
            .timestamp(timestamp)
            .duration(500)
            .failure();

          // Generate errors
          const error = instance
            .error({
              message: 'Connection refused',
              type: 'ConnectionError',
            })
            .timestamp(timestamp);

          return [successTx, failedTx, error];
        })
      )
    );

  return [withClient(infraEsClient, infraData), withClient(apmEsClient, apmData)];
}

export default createCliScenario(({ range, clients: { infraEsClient, apmEsClient } }) => {
  const hosts: HostConfig[] = [
    {
      name: 'discover-host-01',
      cpuUsage: 0.65,
      memoryUsage: 0.72,
      diskUsage: 0.45,
      cloudProvider: 'aws',
      cloudRegion: 'us-east-1',
      services: [
        { name: 'payment-service', environment: 'production' },
        { name: 'user-service', environment: 'staging' },
      ],
    },
    {
      name: 'discover-host-02',
      cpuUsage: 0.35,
      memoryUsage: 0.85,
      diskUsage: 0.68,
      cloudProvider: 'gcp',
      cloudRegion: 'us-central1',
      services: [{ name: 'order-service', environment: 'production' }],
    },
  ];

  return generateGetIndexInfoData({ range, infraEsClient, apmEsClient, hosts });
});
