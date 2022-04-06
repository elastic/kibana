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
import { mockDbStatement } from './mock/mock_db';

const scenario: Scenario = async (runOptions: RunOptions) => {
  const { logger } = getCommonServices(runOptions);

  const { numServices = 3 } = runOptions.scenarioOpts || {};

  return {
    generate: ({ from, to }) => {
      const range = timerange(from, to);

      const transactionName = '240rpm/75% 1000ms';

      const successfulTimestamps = range.interval('1s').rate(3);

      const failedTimestamps = range.interval('1s').rate(1);

      const instances = [...Array(numServices).keys()].map((index) =>
        apm.service(`opbeans-go-${index}`, 'production', 'go').instance('instance')
      );
      const instanceSpans = (instance: Instance) => {
        const successfulTraceEvents = successfulTimestamps.spans((timestamp) =>
          instance
            .transaction(transactionName)
            .timestamp(timestamp)
            .duration(1000)
            .success()
            .children(
              instance
                .span('GET /products', 'sql', 'mysql')
                .setFields({ 'span.db.statement': 'SELECT * FROM PRODUCTS' })
                .duration(1000)
                .success()
                .destination('elasticsearch')
                .timestamp(timestamp),
              instance
                .span('GET apm-*/_search', 'db', 'elasticsearch')
                .setFields({ 'span.db.statement': JSON.stringify(mockDbStatement) })
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
              instance.error('[ResponseError] index_not_found_exception').timestamp(timestamp + 50)
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
    },
  };
};

export default scenario;
