/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Generates Elasticsearch monitoring node_stats documents for simulating
 * disk space monitoring scenarios.
 *
 * This scenario creates data that matches the following ES|QL query:
 *
 * FROM .monitoring-es-*
 *   | WHERE source_node.name LIKE "-hot-" OR source_node.name LIKE "-cold-"
 *   | STATS min_available_bytes = MIN(node_stats.fs.total.available_in_byhtes) BY source_node.name
 *   | WHERE min_available_bytes = 107374182400
 *   | KEEP source_node.name, min_available_bytes
 *
 * The scenario generates node_stats documents for hot and cold tier nodes with
 * varying available disk space, including nodes with exactly 100GB (107374182400 bytes) available.
 */

import { generateShortId, type MonitoringDocument } from '@kbn/synthtrace-client';
import { timerange } from '@kbn/synthtrace-client';
import { nodeStats } from '@kbn/synthtrace-client/src/lib/monitoring/node_stats';
import type { Scenario } from '../cli/scenario';
import { withClient } from '../lib/utils/with_client';

const scenario: Scenario<MonitoringDocument> = async (runOptions) => {
  return {
    generate: ({ range, clients: { logsEsClient } }) => {
      // Cluster configuration
      const clusterUuid = generateShortId();

      // Define nodes with different disk space scenarios
      // 100 GB = 107374182400 bytes (the target value from the query)
      const GB_100 = 107374182400;
      const GB_200 = 214748364800;
      const GB_500 = 536870912000;
      const GB_50 = 53687091200;

      const nodes: Array<
        {
          name: string;
          uuid: string;
          tier: string;
          totalBytes: number;
        } & ({ availableBytes: number } | { availableBytesMin: number; availableBytesMax: number })
      > = [
        // Hot tier nodes
        {
          name: 'es-node-hot-1',
          uuid: generateShortId(),
          tier: 'hot',
          // This node will have exactly 100GB available (matches the query filter)
          availableBytes: GB_100,
          totalBytes: GB_500,
        },
        {
          name: 'es-node-hot-2',
          uuid: generateShortId(),
          tier: 'hot',
          // This node fluctuates but minimum reaches 100GB
          availableBytesMin: GB_100,
          availableBytesMax: GB_200,
          totalBytes: GB_500,
        },
        {
          name: 'es-node-hot-3',
          uuid: generateShortId(),
          tier: 'hot',
          // This node has more available space (won't match the query)
          availableBytes: GB_200,
          totalBytes: GB_500,
        },
        // Cold tier nodes
        {
          name: 'es-node-cold-1',
          uuid: generateShortId(),
          tier: 'cold',
          // This cold node also has exactly 100GB available
          availableBytes: GB_100,
          totalBytes: GB_500,
        },
        {
          name: 'es-node-cold-2',
          uuid: generateShortId(),
          tier: 'cold',
          // This cold node has less space available (won't match the query)
          availableBytes: GB_50,
          totalBytes: GB_500,
        },
        {
          name: 'es-node-cold-3',
          uuid: generateShortId(),
          tier: 'cold',
          // This cold node fluctuates and minimum is 100GB
          availableBytesMin: GB_100,
          availableBytesMax: GB_200,
          totalBytes: GB_500,
        },
      ];

      // Generate node_stats documents over time
      const documents = timerange(range.from, range.to)
        .interval('1m') // Generate stats every minute
        .rate(1)
        .generator((timestamp) => {
          return nodes.flatMap((node) => {
            // Calculate available bytes for this timestamp
            let availableBytes: number;

            if ('availableBytes' in node && typeof node.availableBytes === 'number') {
              // Fixed value
              availableBytes = node.availableBytes;
            } else if (
              'availableBytesMin' in node &&
              'availableBytesMax' in node &&
              typeof node.availableBytesMin === 'number' &&
              typeof node.availableBytesMax === 'number'
            ) {
              // Fluctuating value - use timestamp to create variation
              const timeFactor = Math.sin(timestamp / 1000000) * 0.5 + 0.5; // 0 to 1
              availableBytes =
                node.availableBytesMin +
                (node.availableBytesMax - node.availableBytesMin) * timeFactor;
            } else {
              // Fallback (shouldn't happen with proper typing)
              availableBytes = GB_100;
            }

            // Create realistic values for other metrics
            const docCount = Math.floor(1000000 + Math.random() * 500000);
            const storeSizeBytes = Math.floor(
              (node.totalBytes - availableBytes) * 0.8 + Math.random() * 1000000000
            );
            const cpuPercent = Math.floor(20 + Math.random() * 60);
            const heapUsedPercent = Math.floor(40 + Math.random() * 40);
            const heapMaxBytes = 4294967296; // 4GB

            return nodeStats(node.name, node.uuid, clusterUuid)
              .timestamp(timestamp)
              .fsStats(availableBytes, node.totalBytes)
              .cpuPercent(cpuPercent)
              .jvmHeap(heapUsedPercent, heapMaxBytes)
              .indicesStats(docCount, storeSizeBytes)
              .transportAddress(`${node.name}.elastic.local:9300`);
          });
        });

      return withClient(
        logsEsClient as unknown as import('../lib/shared/base_client').SynthtraceEsClient<MonitoringDocument>,
        documents
      );
    },
  };
};

export default scenario;
