/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { apm, timerange } from '../../..';
import { ApmFields } from '../../dsl/apm/apm_fields';
import { Instance } from '../../dsl/apm/instance';
import { Scenario } from '../../cli/scenario';
import { getLogger } from '../../cli/utils/get_common_services';
import { ScenarioOptions } from '../../cli/utils/get_scenario_options';
import { getSynthtraceEnvironment } from '../../lib/utils/get_synthtrace_environment';
import { ApmScenarioDefaults } from '../../lib/apm/apm_scenario_defaults';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);

/** node scripts/synthtrace apm/simple_trace.ts --local --maxDocs 10 --clean */
const scenario: Scenario<ApmFields> = async (options: ScenarioOptions) => {
  const logger = getLogger(options);

  const { numServices = 3 } = options.scenarioOpts || {};

  return {
    ...ApmScenarioDefaults,
    generate: ({ from, to }) => {
      const range = timerange(from, to);

      const transactionName = '240rpm/75% 1000ms';

      const successfulTimestamps = range.ratePerMinute(180);
      const failedTimestamps = range.ratePerMinute(180);

      const instances = [...Array(numServices).keys()].map((index) =>
        apm
          .service({ name: `opbeans-go-${index}`, environment: ENVIRONMENT, agentName: 'go' })
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
