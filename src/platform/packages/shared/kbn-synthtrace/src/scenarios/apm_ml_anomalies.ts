/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Generates APM data with recurring spikes in latency, throughput, and failure rate
 * for testing ML anomaly detection. Uses 1-second granularity so --live mode
 * produces a continuous data stream. Spikes occur for 2 minutes every 10 minutes
 * based on wall-clock time.
 */

import type { ApmFields } from '@kbn/synthtrace-client';
import { apm } from '@kbn/synthtrace-client';
import { range as _range } from 'lodash';
import type { Scenario } from '../cli/scenario';
import { withClient } from '../lib/utils/with_client';

const SPIKE_DURATION_MIN = 2;
const SPIKE_CYCLE_MIN = 10;
const SPIKE_LATENCY = 5000;
const SPIKE_RATE = 10;
const NORMAL_DURATION = 50;
const NORMAL_RATE = 1;

const isSpiking = (timestamp: number) => {
  const minuteInCycle = Math.floor(timestamp / 60_000) % SPIKE_CYCLE_MIN;
  return minuteInCycle < SPIKE_DURATION_MIN;
};

const scenario: Scenario<ApmFields> = async (runOptions) => {
  const { logger } = runOptions;

  return {
    generate: ({ range, clients: { apmEsClient } }) => {
      const serviceA = apm.service('a', 'production', 'java').instance('a');
      const serviceB = apm.service('b', 'production', 'go').instance('b');

      const apmData = range
        .interval('1s')
        .rate(1)
        .generator((timestamp) => {
          const spiking = isSpiking(timestamp);
          const count = spiking ? SPIKE_RATE : NORMAL_RATE;
          const duration = spiking ? SPIKE_LATENCY : NORMAL_DURATION;
          const outcome = spiking ? 'failure' : 'success';
          return [
            ..._range(0, count).flatMap((_) =>
              serviceA
                .transaction('tx', 'request')
                .timestamp(timestamp)
                .duration(duration)
                .outcome(outcome)
            ),
            serviceB.transaction('tx', 'Worker').timestamp(timestamp).duration(duration).success(),
            serviceB
              .transaction('tx2', 'request')
              .timestamp(timestamp)
              .duration(NORMAL_DURATION)
              .success(),
          ];
        });

      return withClient(
        apmEsClient,
        logger.perf('generating_apm_events', () => apmData)
      );
    },
  };
};

export default scenario;
