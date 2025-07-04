/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { apm, ApmFields } from '@kbn/apm-synthtrace-client';
import { range as _range } from 'lodash';
import { Scenario } from '../cli/scenario';
import { withClient } from '../lib/utils/with_client';

const spikeStart = new Date('2024-09-03T00:00:00.000Z').getTime();
const spikeEnd = new Date('2024-09-03T02:00:00.000Z').getTime();
const NORMAL_DURATION = 100;
const NORMAL_RATE = 1;

const scenario: Scenario<ApmFields> = async (runOptions) => {
  const { logger } = runOptions;

  return {
    generate: ({ range, clients: { apmEsClient } }) => {
      const serviceA = apm.service('a', 'production', 'java').instance('a');
      const serviceB = apm.service('b', 'production', 'go').instance('b');

      const apmData = range
        .interval('1m')
        .rate(1)
        .generator((timestamp) => {
          const isInSpike = timestamp >= spikeStart && timestamp < spikeEnd;
          const count = isInSpike ? 4 : NORMAL_RATE;
          const duration = isInSpike ? 1000 : NORMAL_DURATION;
          const outcome = isInSpike ? 'failure' : 'success';
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
