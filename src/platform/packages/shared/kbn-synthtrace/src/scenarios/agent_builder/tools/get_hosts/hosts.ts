/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * SCENARIO: Generated Hosts
 *
 * Story: Generates hosts with infrastructure metrics and correlated APM services.
 *
 * - `test-host-01` (AWS, us-east-1):
 *   - 65% CPU, 72% Memory, 45% Disk
 *   - Services: `payment-service`, `user-service`
 *
 * - `test-host-02` (GCP, us-central1):
 *   - 35% CPU, 85% Memory, 68% Disk
 *   - Services: `order-service`
 *
 * NOTE: This scenario generates high-volume infrastructure metrics (6 metric types × 2 hosts
 * at 30-second intervals). For faster execution, use shorter time ranges (15-30 minutes):
 *
 * ```
 * node scripts/synthtrace <path> --from "now-15m" --to "now" --clean --workers=1
 * ```
 *
 * Validate via:
 *
 * ```
 * POST kbn:///api/agent_builder/tools/_execute
 * {
 *   "tool_id": "observability.get_hosts",
 *   "tool_params": {
 *     "start": "now-1h",
 *     "end": "now"
 *   }
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
  services?: string[];
}

/**
 * Generates infrastructure metrics and APM data for a set of hosts.
 * Can be used both by CLI (via default export) and by API tests (via direct import).
 */
export function generateHostsData({
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
  const infraData = range
    .interval('30s')
    .rate(1)
    .generator((timestamp) =>
      hosts.flatMap((hostConfig) => {
        const host = infra.host(hostConfig.name);
        const totalMemory = 68_719_476_736; // 64GB
        const usedMemory = Math.floor(totalMemory * hostConfig.memoryUsage);

        // Use overrides() instead of defaults() to ensure cloud.provider
        // from hostConfig takes precedence over the default 'gcp' set by infra.host()
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

  const apmData = range
    .interval('1m')
    .rate(5)
    .generator((timestamp) =>
      hosts.flatMap((hostConfig) =>
        (hostConfig.services ?? []).flatMap((serviceName) => {
          const instance = apm
            .service({ name: serviceName, environment: 'production', agentName: 'nodejs' })
            .instance(`${serviceName}-instance`)
            .overrides({ 'host.name': hostConfig.name });

          return instance
            .transaction({ transactionName: 'GET /api/health' })
            .timestamp(timestamp)
            .duration(100)
            .success();
        })
      )
    );

  return [withClient(infraEsClient, infraData), withClient(apmEsClient, apmData)];
}

export default createCliScenario(({ range, clients: { infraEsClient, apmEsClient } }) => {
  const hosts = [
    {
      name: 'test-host-01',
      cpuUsage: 0.65,
      memoryUsage: 0.72,
      diskUsage: 0.45,
      cloudProvider: 'aws',
      cloudRegion: 'us-east-1',
      services: ['payment-service', 'user-service'],
    },
    {
      name: 'test-host-02',
      cpuUsage: 0.35,
      memoryUsage: 0.85,
      diskUsage: 0.68,
      cloudProvider: 'gcp',
      cloudRegion: 'us-central1',
      services: ['order-service'],
    },
  ];

  return generateHostsData({ range, infraEsClient, apmEsClient, hosts });
});
