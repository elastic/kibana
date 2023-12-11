/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { ApmFields, apm, Instance } from '@kbn/apm-synthtrace-client';
import { Scenario } from '../cli/scenario';
import { getSynthtraceEnvironment } from '../lib/utils/get_synthtrace_environment';
import { withClient } from '../lib/utils/with_client';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);

const scenario: Scenario<ApmFields> = async (runOptions) => {
  const { logger } = runOptions;
  const { numServices = 3 } = runOptions.scenarioOpts || {};
  const numTransactions = 100;

  return {
    generate: ({ range, clients: { apmEsClient } }) => {
      const urls = ['GET /order', 'POST /basket', 'DELETE /basket', 'GET /products'];

      const successfulTimestamps = range.ratePerMinute(180);
      const failedTimestamps = range.interval('1m').rate(180);

      const instances = [...Array(numServices).keys()].map((index) =>
        apm
          .service({ name: `synth-go-${index}`, environment: ENVIRONMENT, agentName: 'go' })
          .instance(`instance-${index}`)
      );

      const transactionNames = [...Array(numTransactions).keys()].map(
        (index) => `${urls[index % urls.length]}/${index}`
      );

      const instanceSpans = (instance: Instance, transactionName: string) => {
        const successfulTraceEvents = successfulTimestamps.generator((timestamp) =>
          instance.transaction({ transactionName }).timestamp(timestamp).duration(1000).success()
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

        return [successfulTraceEvents, failedTraceEvents, metricsets];
      };

      return withClient(
        apmEsClient,
        logger.perf('generating_apm_events', () =>
          instances
            .flatMap((instance) =>
              transactionNames.map((transactionName) => ({ instance, transactionName }))
            )
            .flatMap(({ instance, transactionName }, index) =>
              instanceSpans(instance, transactionName)
            )
        )
      );
    },
  };
};

export default scenario;
