/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { stackMonitoring, timerange } from '../..';
import { Scenario } from '../scenario';
import { getLogger } from '../utils/get_common_services';
import { RunOptions } from '../utils/parse_run_cli_flags';
import { ApmFields } from '../../lib/apm/apm_fields';

const scenario: Scenario<ApmFields> = async (runOptions: RunOptions) => {
  const logger = getLogger(runOptions);

  // TODO reintroduce overwrite
  // if (!runOptions.writeTarget) {
  //  throw new Error('Write target is not defined');
  // }

  return {
    generate: ({ from, to }) => {
      const kibanaStats = stackMonitoring.cluster('cluster-01').kibana('kibana-01').stats();

      const range = timerange(from, to);
      return range
        .interval('30s')
        .rate(1)
        .generator((timestamp) => {
          const events = logger.perf('generating_sm_events', () => {
            return kibanaStats.timestamp(timestamp).requests(10, 20);
          });
          return events;
        });
    },
  };
};

export default scenario;
