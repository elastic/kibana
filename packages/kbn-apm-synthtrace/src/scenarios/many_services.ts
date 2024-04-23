/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ApmFields, apm, Instance } from '@kbn/apm-synthtrace-client';
import { flatten, random, times } from 'lodash';
import { Scenario } from '../cli/scenario';
import { getSynthtraceEnvironment } from '../lib/utils/get_synthtrace_environment';
import { withClient } from '../lib/utils/with_client';
import { getRandomNameForIndex } from './helpers/random_names';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);

const scenario: Scenario<ApmFields> = async ({ logger, scenarioOpts = { services: 2000 } }) => {
  const numServices = scenarioOpts.services;
  const transactionName = 'GET /order/{id}';
  const languages = ['go', 'dotnet', 'java', 'python'];
  const agentVersions: Record<string, string[]> = {
    go: ['2.1.0', '2.0.0', '1.15.0', '1.14.0', '1.13.1'],
    dotnet: ['1.18.0', '1.17.0', '1.16.1', '1.16.0', '1.15.0'],
    java: ['1.34.1', '1.34.0', '1.33.0', '1.32.0', '1.32.0'],
    python: ['6.12.0', '6.11.0', '6.10.2', '6.10.1', '6.10.0'],
  };

  return {
    generate: ({ range, clients: { apmEsClient } }) => {
      const instances = flatten(
        times(numServices).map((index) => {
          const language = languages[index % languages.length];
          const agentLanguageVersions = agentVersions[language];
          const agentVersion = agentLanguageVersions[index % agentLanguageVersions.length];

          const numOfInstances = (index % 3) + 1;
          return times(numOfInstances).map((instanceIndex) =>
            apm
              .service({
                name: `${getRandomNameForIndex(index)}-${language}-${index}`,
                environment: ENVIRONMENT,
                agentName: language,
              })
              .instance(`instance-${index}-${instanceIndex}`)
              .defaults({ 'agent.version': agentVersion, 'service.language.name': language })
          );
        })
      );

      const instanceSpans = (instance: Instance) => {
        const hasHighDuration = Math.random() > 0.5;
        const throughput = random(1, 10);

        return range.ratePerMinute(throughput).generator((timestamp) => {
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
      };

      return withClient(
        apmEsClient,
        logger.perf('generating_apm_events', () => instances.map(instanceSpans))
      );
    },
  };
};

export default scenario;
