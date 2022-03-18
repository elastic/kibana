/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { range } from 'lodash';
import { apm, timerange } from '../../index';
import { Scenario } from '../scenario';
import { RunOptions } from '../utils/parse_run_cli_flags';

/**
 * How to run it:
 * node packages/elastic-apm-synthtrace/src/scripts/run
 * packages/elastic-apm-synthtrace/src/scripts/examples/04-anomaly.ts
 * --target=ES_HOST
 * --username USERNAME
 * --password PWD
 * --from now-2w
 * --live
 *
 * It's important to have enough data before to generate an anomaly, so set --from now-2w
 * @param runOptions
 * @returns
 */
const scenario: Scenario = async (runOptions: RunOptions) => {
  return {
    generate: ({ from, to }, options) => {
      const serviceC = apm.service('My Service', 'production', 'java').instance('a');
      const NORMAL_DURATION = 100;
      const NORMAL_RATE = 1;
      let firstRun = options?.isLiveMode;

      const events = timerange(new Date(from).getTime(), new Date(to).getTime())
        .interval('1m')
        .rate(1)
        .spans((timestamp) => {
          // randomly spikes to keep creating anomalies
          const isInSpike = options?.isLiveMode && Math.random() * 100 < 2;

          const count = isInSpike ? 6 : NORMAL_RATE;
          const duration = isInSpike ? 1000 : NORMAL_DURATION;
          const outcome = isInSpike ? 'failure' : 'success';
          // Spike the firt time it runs to create an anomaly
          if (firstRun) {
            firstRun = false;
            return [
              ...range(0, 6).flatMap((_) =>
                serviceC
                  .transaction('tx', 'request')
                  .timestamp(timestamp)
                  .duration(1000)
                  .outcome('failure')
                  .serialize()
              ),
            ];
          }

          return [
            ...range(0, count).flatMap((_) =>
              serviceC
                .transaction('tx', 'request')
                .timestamp(timestamp)
                .duration(duration)
                .outcome(outcome)
                .serialize()
            ),
          ];
        });

      return events;
    },
  };
};

export default scenario;
