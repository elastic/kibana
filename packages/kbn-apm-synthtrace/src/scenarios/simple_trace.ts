/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { apm, timerange } from '../..';
import { ApmFields } from '../lib/apm/apm_fields';
import { Instance } from '../lib/apm/instance';
import { Scenario } from '../cli/scenario';
import { getLogger } from '../cli/utils/get_common_services';
import { RunOptions } from '../cli/utils/parse_run_cli_flags';
import { getSynthtraceEnvironment } from '../lib/utils/get_synthtrace_environment';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);

const scenario: Scenario<ApmFields> = async (runOptions: RunOptions) => {
  const logger = getLogger(runOptions);

  const { numServices = 3 } = runOptions.scenarioOpts || {};

  return {
    generate: ({ from, to }) => {
      const range = timerange(from, to);

      const transactionName = '240rpm/75% 1000ms';

      const successfulTimestamps = range.ratePerMinute(180);
      const failedTimestamps = range.ratePerMinute(180);

      const instances = [...Array(numServices).keys()].map((index) =>
        apm
          .service({ name: `synth-go-${index}`, environment: ENVIRONMENT, agentName: 'go' })
          .instance('instance')
      );
      const instanceSpans = (instance: Instance) => {
        const successfulTraceEvents = successfulTimestamps.generator((timestamp) =>
          instance
            .transaction({ transactionName })
            .timestamp(timestamp)
            .duration(1000)
            .success()
            .children(
              instance
                .span({
                  spanName: 'GET apm-*/_search',
                  spanType: 'db',
                  spanSubtype: 'elasticsearch',
                })
                .duration(1000)
                .success()
                .destination('elasticsearch')
                .timestamp(timestamp),
              instance
                .span({ spanName: 'custom_operation', spanType: 'custom' })
                .duration(100)
                .success()
                .timestamp(timestamp)
            )
        );

        const failedTraceEvents = failedTimestamps.generator((timestamp) =>
          instance
            .transaction({ transactionName })
            .timestamp(timestamp)
            .duration(1000)
            .failure()
            .errors(
              instance
                .error({ message: '[ResponseError] index_not_found_exception' })
                .timestamp(timestamp + 50)
            )
        );

        const metricsets = range
          .interval('30s')
          .rate(1)
          .generator((timestamp) =>
            instance
              .appMetrics({
                'system.memory.actual.free': 800,
                'system.memory.total': 1000,
                'system.cpu.total.norm.pct': 0.6,
                'system.process.cpu.total.norm.pct': 0.7,
              })
              .timestamp(timestamp)
          );

        return successfulTraceEvents.merge(failedTraceEvents, metricsets);
      };

      return instances
        .map((instance) => logger.perf('generating_apm_events', () => instanceSpans(instance)))
        .reduce((p, c) => p.merge(c));
    },
  };
};

export default scenario;
