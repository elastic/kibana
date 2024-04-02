/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { apm, ApmFields, Instance } from '@kbn/apm-synthtrace-client';
import { Scenario } from '../cli/scenario';
import { RunOptions } from '../cli/utils/parse_run_cli_flags';
import { withClient } from '../lib/utils/with_client';
import { timeBasedPattern } from './helpers/time_based_pattern';

const scenario: Scenario<ApmFields> = async (runOptions: RunOptions) => {
  return {
    generate: ({ range, clients: { apmEsClient } }) => {
      const throughputPattern = timeBasedPattern({
        min: 1,
        max: 10,
        peak: 0.7,
        cycle: 24 * 60 * 60 * 1000,
      });

      const durationPattern = timeBasedPattern({
        min: 10,
        max: 410,
        peak: 0.7,
        cycle: 24 * 60 * 60 * 1000,
      });

      const service = apm.service('myService', 'production', 'go');
      const instanceA = service.instance('a');
      const instanceB = service.instance('b');

      function generateTrace(instance: Instance, duration: number, timestamp: number) {
        return instance
          .transaction('GET /api')
          .duration(duration)
          .timestamp(timestamp)
          .outcome('success');
      }

      return withClient(
        apmEsClient,
        range
          .interval('1m')
          .rate(1)
          .generator((timestamp) => {
            const throughput = Math.floor(throughputPattern(timestamp));

            const traces = new Array(throughput).fill(undefined).flatMap((_, index) => {
              return [
                generateTrace(instanceA, durationPattern(timestamp), timestamp),
                generateTrace(instanceB, durationPattern(timestamp) * 1.25, timestamp),
              ];
            });

            return traces;
          })
      );
    },
  };
};

export default scenario;
