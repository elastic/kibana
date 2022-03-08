/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { apm, timerange } from '../../index';
import { apmEventsToElasticsearchOutput } from '../../lib/apm/utils/apm_events_to_elasticsearch_output';
import { getApmWriteTargets } from '../../lib/apm/utils/get_apm_write_targets';
import { Scenario } from '../scenario';
import { getCommonServices } from '../utils/get_common_services';

const scenario: Scenario = async ({ target, logLevel, scenarioOpts }) => {
  const { client, logger } = getCommonServices({ target, logLevel });
  const writeTargets = await getApmWriteTargets({ client });

  return {
    generate: ({ from, to }) => {
      const range = timerange(from, to);
      const successfulTimestamps = range.interval('1m').rate(1);

      const events = logger.perf('generating_apm_events', () => {
        const goServiceInstance = apm
          .service('opbeans-go', 'production', 'go')
          .instance('go-instance1');

        const successfulTraceEventsGoServiceElasticsearch = successfulTimestamps.flatMap(
          (timestamp) =>
            goServiceInstance
              .transaction('go service / elasticsearch')
              .timestamp(timestamp)
              .duration(700)
              .success()
              .children(
                goServiceInstance
                  .span('GET apm-*/_search', 'db', 'elasticsearch')
                  .duration(700)
                  .success()
                  .destination('elasticsearch')
                  .timestamp(timestamp)
              )
              .serialize()
        );

        const successfulTraceEventsGoServiceMysql = successfulTimestamps.flatMap((timestamp) =>
          goServiceInstance
            .transaction('go service / mysql')
            .timestamp(timestamp)
            .duration(500)
            .success()
            .children(
              goServiceInstance
                .span('SELECT FROM USERS', 'db', 'mysql')
                .duration(500)
                .success()
                .destination('mysql/users')
                .timestamp(timestamp)
            )
            .serialize()
        );

        const nodeServiceInstance = apm
          .service('opbeans-node', 'production', 'nodejs')
          .instance('nodejs-instance1');

        const successfulTraceEventsWithServiceTargetMysql = successfulTimestamps.flatMap(
          (timestamp) =>
            nodeServiceInstance
              .transaction('nodejs service / mysql')
              .timestamp(timestamp)
              .duration(1000)
              .success()
              .children(
                nodeServiceInstance
                  .span('SELECT FROM USERS', 'db', 'mysql')
                  .duration(1000)
                  .success()
                  .destination('mysql/users')
                  .destinationWithServiceTarget('mysql', 'users')
                  .timestamp(timestamp)
              )
              .serialize()
        );

        const successfulTraceEventsWithServiceTargetPostgresql = successfulTimestamps.flatMap(
          (timestamp) =>
            nodeServiceInstance
              .transaction('nodejs service / postgresql')
              .timestamp(timestamp)
              .duration(800)
              .success()
              .children(
                nodeServiceInstance
                  .span('SELECT FROM CUSTOMERS', 'db', 'postgresql')
                  .duration(800)
                  .success()
                  .destination('postgresql')
                  .destinationWithServiceTarget('postgresql')
                  .timestamp(timestamp)
              )
              .serialize()
        );

        return [
          ...successfulTraceEventsGoServiceElasticsearch,
          ...successfulTraceEventsGoServiceMysql,
          ...successfulTraceEventsWithServiceTargetMysql,
          ...successfulTraceEventsWithServiceTargetPostgresql,
        ];
      });

      return logger.perf('apm_events_to_es_output', () =>
        apmEventsToElasticsearchOutput({
          events: [
            ...events,
            ...logger.perf('get_transaction_metrics', () => apm.getTransactionMetrics(events)),
            ...logger.perf('get_span_destination_metrics', () =>
              apm.getSpanDestinationMetrics(events)
            ),
            ...logger.perf('get_breakdown_metrics', () => apm.getBreakdownMetrics(events)),
          ],
          writeTargets,
        })
      );
    },
  };
};

export default scenario;
