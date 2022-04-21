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
import { getLogger } from '../utils/get_common_services';
import { RunOptions } from '../utils/parse_run_cli_flags';
import { StackMonitoringFields } from '../../lib/stack_monitoring/stack_monitoring_fields';

const scenario: Scenario<StackMonitoringFields> = async (runOptions: RunOptions) => {
  const logger = getLogger(runOptions);

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
      const interval = range.interval('10s').rate(1);
      return interval
        .generator((timestamp) =>
          logger.perf('generating_es_events', () => clusterStats.timestamp(timestamp).indices(115))
        )
        .merge(
          interval.generator((timestamp) =>
            logger.perf('generating_kb_events', () =>
              kibanaStats.timestamp(timestamp).requests(10, 20)
            )
          )
        );
    },
  };
};

export default scenario;
