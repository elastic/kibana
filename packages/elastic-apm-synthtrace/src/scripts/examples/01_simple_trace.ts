/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { apm, timerange } from '../../index';
import { Instance } from '../../lib/apm/instance';
import { Scenario } from '../scenario';
import { getCommonServices } from '../utils/get_common_services';
import { RunOptions } from '../utils/parse_run_cli_flags';

const scenario: Scenario = async (runOptions:RunOptions, scenarioOpts) => {
  const { logger } = getCommonServices(runOptions);
  // const writeTargets = await getApmWriteTargets({ client });

  const { numServices = 3 } = scenarioOpts || {};

  return {
    generate: ({ from, to }) => {
      const range = timerange(from, to);

      const transactionName = '240rpm/75% 1000ms';

      const successfulTimestamps = range.interval('1s').rate(3);

      const failedTimestamps = range.interval('1s').rate(1);

      const instances = [...Array(numServices).keys()]
          .map(index => apm.service(`opbeans-go-${index}`, 'production', 'go').instance('instance'));
      const instanceSpans = (instance: Instance) => {
        const successfulTraceEvents = successfulTimestamps.spans((timestamp) =>
          instance
            .transaction(transactionName)
            .timestamp(timestamp)
            .duration(1000)
            .success()
            .children(
              instance
                .span('GET apm-*/_search', 'db', 'elasticsearch')
                .duration(1000)
                .success()
                .destination('elasticsearch')
                .timestamp(timestamp),
              instance
                .span('custom_operation', 'custom')
                .duration(100)
                .success()
                .timestamp(timestamp)
            )
            .serialize()
        );

        const failedTraceEvents = failedTimestamps.spans((timestamp) =>
          instance
            .transaction(transactionName)
            .timestamp(timestamp)
            .duration(1000)
            .failure()
            .errors(
              instance
                .error('[ResponseError] index_not_found_exception')
                .timestamp(timestamp + 50)
            )
            .serialize()
        );

        const metricsets = range
          .interval('30s')
          .rate(1)
          .spans((timestamp) =>
            instance
              .appMetrics({
                'system.memory.actual.free': 800,
                'system.memory.total': 1000,
                'system.cpu.total.norm.pct': 0.6,
                'system.process.cpu.total.norm.pct': 0.7,
              })
              .timestamp(timestamp)
              .serialize()
          );

        return successfulTraceEvents.concat(failedTraceEvents, metricsets);
      };

      return instances
        .map((instance) => logger.perf('generating_apm_events', () => instanceSpans(instance)))
        .reduce((p, c) => p.concat(c));
      //
      // return logger.perf('apm_events_to_es_output', () =>
      //   apmEventsToElasticsearchOutput({
      //     events: [
      //       ...events,
      //       ...logger.perf('get_transaction_metrics', () => apm.getTransactionMetrics(events)),
      //       ...logger.perf('get_span_destination_metrics', () =>
      //         apm.getSpanDestinationMetrics(events)
      //       ),
      //       ...logger.perf('get_breakdown_metrics', () => apm.getBreakdownMetrics(events)),
      //     ],
      //     writeTargets,
      //   })
      // );
    },
  };
};

export default scenario;
