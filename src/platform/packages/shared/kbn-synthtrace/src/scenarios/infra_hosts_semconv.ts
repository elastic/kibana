/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Serializable } from '@kbn/synthtrace-client';
import { times } from 'lodash';
import type { Scenario } from '../cli/scenario';
import { withClient } from '../lib/utils/with_client';

/**
 * Generates OpenTelemetry (semconv) infrastructure host metrics.
 * This scenario satisfies the 'semconv' schema requirement in getPreferredSchema.
 *
 * OTel hostmetricsreceiver emits metrics with a `state` dimension for CPU/memory,
 * and a `direction` dimension for network I/O. This scenario replicates that structure.
 */
const scenario: Scenario<any> = async ({ logger, scenarioOpts = { numHosts: 2 } }) => {
  const { numHosts } = scenarioOpts;

  return {
    generate: ({ range, clients: { infraEsClient } }) => {
      const hosts = times(numHosts).map((index) => `semconv-host-${index}`);

      const metrics = range
        .interval('30s')
        .rate(1)
        .generator((timestamp) =>
          hosts.flatMap((hostName) => {
            const base = {
              'agent.id': `agent-${hostName}`,
              'host.hostname': hostName,
              '@timestamp': timestamp,
              'host.name': hostName,
              'host.os.name': 'linux',
              'cloud.provider': 'aws',
              'cloud.region': 'us-east-1',
              'host.ip': '122.122.122.122',
              'resource.attributes.host.name': hostName,
              'resource.attributes.os.type': 'linux',
              // This is the key: dataset that matches inventory model expectation
              'data_stream.dataset': 'hostmetricsreceiver.otel',
              'data_stream.type': 'metrics',
              'data_stream.namespace': 'default',
            };

            // CPU metrics with state dimension (OTel hostmetricsreceiver format)
            // cpuV2 aggregation: 1 - sum(idle + wait)
            const cpuIdleUtilization = 0.3 + Math.random() * 0.4; // 30-70% idle
            const cpuWaitUtilization = Math.random() * 0.1; // 0-10% wait
            const cpuDocs = [
              { state: 'idle', 'system.cpu.utilization': cpuIdleUtilization },
              { state: 'wait', 'system.cpu.utilization': cpuWaitUtilization },
              { state: 'user', 'system.cpu.utilization': Math.random() * 0.3 },
              { state: 'system', 'system.cpu.utilization': Math.random() * 0.2 },
            ].map((cpu) => ({
              ...base,
              ...cpu,
              'metricset.name': 'cpu',
              'system.cpu.logical.count': 4, // Required for normalizedLoad1m
              'system.cpu.load_average.1m': 1 + Math.random() * 3, // 1-4 load
            }));

            // Memory metrics with state dimension
            // memory aggregation: sum(used + buffered + slab_*)
            // memoryFree aggregation: sum(cached + free + slab_*)
            const totalMemory = 16 * 1024 * 1024 * 1024; // 16GB
            const usedMemory = totalMemory * (0.4 + Math.random() * 0.3); // 40-70% used
            const freeMemory = totalMemory - usedMemory;
            const memDocs = [
              {
                state: 'used',
                'system.memory.utilization': usedMemory / totalMemory,
                'system.memory.usage': usedMemory,
              },
              {
                state: 'free',
                'system.memory.utilization': freeMemory / totalMemory,
                'system.memory.usage': freeMemory,
              },
              {
                state: 'cached',
                'system.memory.utilization': 0.1,
                'system.memory.usage': totalMemory * 0.1,
              },
              {
                state: 'buffered',
                'system.memory.utilization': 0.05,
                'system.memory.usage': totalMemory * 0.05,
              },
              {
                state: 'slab_reclaimable',
                'system.memory.utilization': 0.02,
                'system.memory.usage': totalMemory * 0.02,
              },
              {
                state: 'slab_unreclaimable',
                'system.memory.utilization': 0.01,
                'system.memory.usage': totalMemory * 0.01,
              },
            ].map((mem) => ({
              ...base,
              ...mem,
              'metricset.name': 'memory',
            }));

            // Filesystem metrics for diskSpaceUsage
            const diskDoc = {
              ...base,
              'metricset.name': 'filesystem',
              'metrics.system.filesystem.utilization': 0.3 + Math.random() * 0.4, // 30-70% disk usage
            };

            // Network metrics with direction dimension for txV2/rxV2
            const networkDocs = [
              {
                direction: 'transmit',
                'system.network.io': Math.floor(Math.random() * 1000000000), // bytes transmitted
              },
              {
                direction: 'receive',
                'system.network.io': Math.floor(Math.random() * 1000000000), // bytes received
              },
            ].map((net) => ({
              ...base,
              ...net,
              'metricset.name': 'network',
              'device.keyword': 'eth0',
            }));

            return [...cpuDocs, ...memDocs, diskDoc, ...networkDocs].map(
              (doc) => new Serializable(doc)
            );
          })
        );

      return withClient(
        infraEsClient,
        logger.perf('generating_semconv_hosts', () => metrics)
      );
    },
  };
};

export default scenario;
