/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Generates APM data with cyclic error rate patterns.
 * High error rate (>0.2) for 2 minutes, then low error rate (<0.2) for 3 minutes.
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

      // Cycle duration: 5 minutes (2 minutes high error rate, 3 minutes low error rate)
      const CYCLE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds
      const HIGH_ERROR_RATE_DURATION = 2 * 60 * 1000; // 2 minutes in milliseconds

      function getErrorRate(timestamp: number): number {
        const cyclePosition = timestamp % CYCLE_DURATION;

        if (cyclePosition < HIGH_ERROR_RATE_DURATION) {
          // High error rate: 0.25 to 0.35 (above 0.2)
          return 0.25 + Math.random() * 0.1;
        } else {
          // Low error rate: 0.05 to 0.15 (below 0.2)
          return 0.05 + Math.random() * 0.1;
        }
      }

      return withClient(
        apmEsClient,
        range
          .interval('30s')
          .rate(10) // 10 transactions every 30 seconds
          .generator((timestamp) => {
            const errorRate = getErrorRate(timestamp);
            const shouldFail = Math.random() < errorRate;

            return instance
              .transaction('GET /api/products')
              .duration(500 + Math.random() * 200)
              .timestamp(timestamp)
              .outcome(shouldFail ? 'failure' : 'success')
              .children(
                instance
                  .span('GET products', 'db', 'postgresql')
                  .timestamp(timestamp + 50)
                  .duration(300 + Math.random() * 100)
                  .destination('postgresql')
                  .success()
              );
          })
      );
    },
  };
};

export default scenario;
