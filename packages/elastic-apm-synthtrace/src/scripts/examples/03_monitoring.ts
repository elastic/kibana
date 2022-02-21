/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// Run with: node ./src/scripts/run ./src/scripts/examples/03_monitoring.ts --target=http://elastic:changeme@localhost:9200

import { stackMonitoring, timerange } from '../../index';
import {
  ElasticsearchOutput,
  eventsToElasticsearchOutput,
} from '../../lib/utils/to_elasticsearch_output';
import { Scenario } from '../scenario';
import { getCommonServices } from '../utils/get_common_services';
import { StackMonitoringFields } from '../../lib/stack_monitoring/stack_monitoring_fields';

// TODO (mat): move this into a function like utils/apm_events_to_elasticsearch_output.ts
function smEventsToElasticsearchOutput(
  events: StackMonitoringFields[],
  writeTarget: string
): ElasticsearchOutput[] {
  const smEvents = eventsToElasticsearchOutput({ events, writeTarget });
  smEvents.forEach((event: any) => {
    const ts = event._source['@timestamp'];
    delete event._source['@timestamp'];
    event._source.timestamp = ts;
  });
  return smEvents;
}

const scenario: Scenario = async ({ target, logLevel }) => {
  const { logger } = getCommonServices({ target, logLevel });

  return {
    generate: ({ from, to }) => {
      const cluster = stackMonitoring.cluster('test-cluster');
      const clusterStats = cluster.stats();
      const kibanaStats = cluster.kibana('kibana-01').stats();

      const range = timerange(from, to);
      return range
        .interval('10s')
        .rate(1)
        .flatMap((timestamp) => {
          const clusterEvents = logger.perf('generating_es_events', () => {
            return clusterStats.timestamp(timestamp).indices(115).serialize();
          });
          const clusterOutputs = smEventsToElasticsearchOutput(
            clusterEvents,
            '.monitoring-es-7-synthtrace'
          );

          const kibanaEvents = logger.perf('generating_kb_events', () => {
            return kibanaStats.timestamp(timestamp).requests(10, 20).serialize();
          });
          const kibanaOutputs = smEventsToElasticsearchOutput(
            kibanaEvents,
            '.monitoring-kibana-7-synthtrace'
          );

          return [...clusterOutputs, ...kibanaOutputs];
        });
    },
  };
};

export default scenario;
