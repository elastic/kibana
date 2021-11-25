/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// Run with: node ./src/scripts/run ./src/scripts/examples/03_monitoring.ts --target=http://elastic:changeme@localhost:9200

import { stackMonitoring, timerange } from '../../index';
import { eventsToElasticsearchOutput } from '../../lib/utils/to_elasticsearch_output';
import { Scenario } from '../scenario';
import { getCommonServices } from '../utils/get_common_services';

const scenario: Scenario = async ({ target, logLevel }) => {
  const { logger } = getCommonServices({ target, logLevel });

  return {
    generate: ({ from, to }) => {
      const clusterStats = stackMonitoring.cluster('test-cluster').stats();
      const writeTarget = '.monitoring-es-7-synthtrace';

      const range = timerange(from, to);
      return range
        .interval('10s')
        .rate(1)
        .flatMap((timestamp) => {
          const events = logger.perf('generating_sm_events', () => {
            return clusterStats.timestamp(timestamp).indices(115).serialize();
          });

          return logger.perf('sm_events_to_es_output', () => {
            const smEvents = eventsToElasticsearchOutput({ events, writeTarget });
            smEvents.forEach((event: any) => {
              const ts = event._source['@timestamp'];
              delete event._source['@timestamp'];
              event._source.timestamp = ts;
            });
            return smEvents;
          });
        });
    },
  };
};

// eslint-disable-next-line import/no-default-export
export default scenario;
