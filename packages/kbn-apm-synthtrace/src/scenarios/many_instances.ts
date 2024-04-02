/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ApmFields, apm, Instance } from '@kbn/apm-synthtrace-client';
import { random, times } from 'lodash';
import { Scenario } from '../cli/scenario';
import { getSynthtraceEnvironment } from '../lib/utils/get_synthtrace_environment';
import { withClient } from '../lib/utils/with_client';
import { getRandomNameForIndex } from './helpers/random_names';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);

const scenario: Scenario<ApmFields> = async ({ logger, scenarioOpts = { instances: 2000 } }) => {
  const numInstances = scenarioOpts.instances;
  const agentVersions = ['2.1.0', '2.0.0', '1.15.0', '1.14.0', '1.13.1'];
  const language = 'java';
  const transactionName = 'GET /order/{id}';

  return {
    generate: ({ range, clients: { apmEsClient } }) => {
      const instances = times(numInstances).map((index) => {
        const agentVersion = agentVersions[index % agentVersions.length];
        const randomName = getRandomNameForIndex(index);
        return apm
          .service({
            name: 'synthtrace-high-cardinality-0',
            environment: ENVIRONMENT,
            agentName: language,
          })
          .instance(`instance-${randomName}-${index}`)
          .defaults({ 'agent.version': agentVersion, 'service.language.name': language });
      });

      const instanceSpans = (instance: Instance) => {
        const hasHighDuration = Math.random() > 0.5;
        const throughput = random(1, 10);

        const traces = range.ratePerMinute(throughput).generator((timestamp) => {
          const parentDuration = hasHighDuration ? random(1000, 5000) : random(100, 1000);
          const generateError = random(1, 4) % 3 === 0;
          const span = instance
            .transaction({ transactionName })
            .timestamp(timestamp)
            .duration(parentDuration);

          return !generateError
            ? span.success()
            : span.failure().errors(
                instance
                  .error({
                    message: `No handler for ${transactionName}`,
                    type: 'No handler',
                    culprit: 'request',
                  })
                  .timestamp(timestamp + 50)
              );
        });

        const cpuPct = random(0, 1);
        const memoryFree = random(0, 1000);
        const metricsets = range
          .interval('30s')
          .rate(1)
          .generator((timestamp) =>
            instance
              .appMetrics({
                'system.memory.actual.free': memoryFree,
                'system.memory.total': 1000,
                'system.cpu.total.norm.pct': cpuPct,
                'system.process.cpu.total.norm.pct': 0.7,
              })
              .timestamp(timestamp)
          );

        return [traces, metricsets];
      };

      return withClient(
        apmEsClient,
        logger.perf('generating_apm_events', () => instances.flatMap(instanceSpans))
      );
    },
  };
};

export default scenario;
