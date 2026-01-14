/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Generates APM data with cyclic latency patterns.
 * High latency (≥1500ms) for 5 minutes, then low latency (≤700ms) for 5 minutes.
 */

import type { ApmFields } from '@kbn/synthtrace-client';
import { apm } from '@kbn/synthtrace-client';
import type { Scenario } from '../cli/scenario';
import type { RunOptions } from '../cli/utils/parse_run_cli_flags';
import { withClient } from '../lib/utils/with_client';

const scenario: Scenario<ApmFields> = async (runOptions: RunOptions) => {
  return {
    generate: ({ range, clients: { apmEsClient } }) => {
      const service = apm.service('opbeans-node', 'production', 'nodejs');
      const instance = service.instance('instance-1');

      // Cycle duration: 10 minutes (5 minutes high, 5 minutes low)
      const CYCLE_DURATION = 10 * 60 * 1000; // 10 minutes in milliseconds
      const HIGH_LATENCY_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

      function getLatency(timestamp: number): number {
        const cyclePosition = timestamp % CYCLE_DURATION;

        if (cyclePosition < HIGH_LATENCY_DURATION) {
          // High latency phase: 1500ms to 2000ms
          return 1500 + Math.random() * 500;
        } else {
          // Low latency phase: 400ms to 700ms
          return 400 + Math.random() * 300;
        }
      }

      return withClient(
        apmEsClient,
        range
          .interval('30s')
          .rate(10) // 10 transactions every 30 seconds
          .generator((timestamp) => {
            const latency = getLatency(timestamp);

            return instance
              .transaction('GET /api/products')
              .duration(latency)
              .timestamp(timestamp)
              .outcome('success')
              .children(
                instance
                  .span('GET products', 'db', 'postgresql')
                  .timestamp(timestamp + 50)
                  .duration(latency * 0.6)
                  .destination('postgresql')
                  .success()
              );
          })
      );
    },
  };
};

export default scenario;
