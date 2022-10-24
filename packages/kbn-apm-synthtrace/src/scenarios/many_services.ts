/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { flatten, random } from 'lodash';

import { apm, timerange } from '../..';
import { Instance } from '../lib/apm/instance';
import { Scenario } from '../cli/scenario';
import { getLogger } from '../cli/utils/get_common_services';
import { RunOptions } from '../cli/utils/parse_run_cli_flags';
import { ApmFields } from '../lib/apm/apm_fields';
import { getSynthtraceEnvironment } from '../lib/utils/get_synthtrace_environment';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);

const scenario: Scenario<ApmFields> = async (runOptions: RunOptions) => {
  const logger = getLogger(runOptions);

  const numServices = 500;
  const maxInstancesPerService = 5;
  const minInstancesPerService = 1;
  const languages = ['go', 'dotnet', 'java', 'python'];
  const services = ['web', 'order-processing', 'api-backend', 'proxy'];
  const agentVersions: Record<string, string[]> = {
    go: ['2.1.0', '2.0.0', '1.15.0', '1.14.0', '1.13.1'],
    dotnet: ['1.18.0', '1.17.0', '1.16.1', '1.16.0', '1.15.0'],
    java: ['1.34.1', '1.34.0', '1.33.0', '1.32.0', '1.32.0'],
    python: ['6.12.0', '6.11.0', '6.10.2', '6.10.1', '6.10.0'],
  };

  return {
    generate: ({ from, to }) => {
      const range = timerange(from, to);

      const successfulTimestamps = range.ratePerMinute(180);

      const instances = flatten([...Array(numServices).keys()].map((index) => {
        const language = languages[index % languages.length];
        const agentLanguageVersions =  agentVersions[language];

        const numOfInstances = Math.floor(Math.random() * (maxInstancesPerService - minInstancesPerService + 1) + minInstancesPerService);

        return [...Array(numOfInstances).keys()].map((instanceIndex) =>
          apm
            .service({
              name: `${services[index % services.length]}-${
                language
              }-${index}`,
              environment: ENVIRONMENT,
              agentName: language,
              agentVersion: agentLanguageVersions[Math.floor(Math.random() * agentLanguageVersions.length)],
            })
            .instance(`instance-${index}-${instanceIndex}`),
        );
      }));

      const urls = ['GET /order/{id}', 'POST /basket/{id}', 'DELETE /basket', 'GET /products'];

      const instanceSpans = (instance: Instance, url: string) => {
        const successfulTraceEvents = successfulTimestamps.generator((timestamp) => {
          const randomHigh = random(1000, 4000);
          const randomLow = random(100, randomHigh / 5);
          const duration = random(randomLow, randomHigh);
          const childDuration = random(randomLow, duration);
          const remainderDuration = duration - childDuration;
          const generateError = random(1, 4) % 3 === 0;
          const generateChildError = random(0, 5) % 2 === 0;
          const span = instance
            .transaction({ transactionName: url })
            .timestamp(timestamp)
            .duration(duration)
            .children(
              instance
                .span({
                  spanName: 'GET apm-*/_search',
                  spanType: 'db',
                  spanSubtype: 'elasticsearch',
                })
                .duration(childDuration)
                .destination('elasticsearch')
                .timestamp(timestamp)
                .outcome(generateError && generateChildError ? 'failure' : 'success'),
              instance
                .span({ spanName: 'custom_operation', spanType: 'custom' })
                .duration(remainderDuration)
                .success()
                .timestamp(timestamp + childDuration)
            );
          return !generateError
            ? span.success()
            : span
                .failure()
                .errors(
                  instance.error({ message: `No handler for ${url}` }).timestamp(timestamp + 50)
                );
        });

        return successfulTraceEvents;
      };

      return instances
        .flatMap((instance) => urls.map((url) => ({ instance, url })))
        .map(({ instance, url }) =>
          logger.perf('generating_apm_events', () => instanceSpans(instance, url))
        )
        .reduce((p, c) => p.merge(c));
    },
  };
};

export default scenario;
