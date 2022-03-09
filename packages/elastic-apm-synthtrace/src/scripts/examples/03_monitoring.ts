/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// Run with: node ./src/scripts/run ./src/scripts/examples/03_monitoring.ts --target=http://elastic:changeme@localhost:9200

import { stackMonitoring, timerange } from '../../index';
import { Scenario } from '../scenario';
import { getCommonServices } from '../utils/get_common_services';
import { RunOptions } from '../utils/parse_run_cli_flags';

const scenario: Scenario = async (runOptions: RunOptions) => {
  const { logger } = getCommonServices(runOptions);

  return {
    mapToIndex: (data) => {
      return data.kibana_stats?.kibana?.name
        ? '.monitoring-kibana-7-synthtrace'
        : '.monitoring-es-7-synthtrace';
    },
    generate: ({ from, to }) => {
      const cluster = stackMonitoring.cluster('test-cluster');
      const clusterStats = cluster.stats();
      const kibanaStats = cluster.kibana('kibana-01').stats();

      const range = timerange(from, to);
      return range
        .interval('10s')
        .rate(1)
        .spans((timestamp) => {
          const clusterEvents = logger.perf('generating_es_events', () => {
            return clusterStats.timestamp(timestamp).indices(115).serialize();
          });
          const kibanaEvents = logger.perf('generating_kb_events', () => {
            return kibanaStats.timestamp(timestamp).requests(10, 20).serialize();
          });
          return [...clusterEvents, ...kibanaEvents];
        });
    },
  };
};

export default scenario;
