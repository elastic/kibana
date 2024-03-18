/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { random } from 'lodash';
import { apm, Instance, ApmFields } from '@kbn/apm-synthtrace-client';
import { Scenario } from '../cli/scenario';
import { getSynthtraceEnvironment } from '../lib/utils/get_synthtrace_environment';
import { withClient } from '../lib/utils/with_client';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);

const scenario: Scenario<ApmFields> = async ({ logger }) => {
  const languages = ['go', 'dotnet', 'java', 'python'];
  const services = ['web', 'order-processing', 'api-backend'];

  return {
    generate: ({ range, clients: { apmEsClient } }) => {
      const successfulTimestamps = range.interval('1s');

      const instances = services.map((service, index) =>
        apm
          .service({
            name: `${service}-${languages[index % languages.length]}`,
            environment: ENVIRONMENT,
            agentName: languages[index % languages.length],
          })
          .instance(`instance-${index}`)
      );
      const entities = [
        'order',
        'book',
        'product',
        'baskets',
        'user',
        'exporter',
        'set',
        'profile',
      ];
      const routes = (e: string) => {
        return [
          `HEAD /${e}/{id}`,
          `GET /${e}/{id}`,
          `PUT /${e}s`,
          `POST /${e}s`,
          `DELETE /${e}/{id}`,
          `GET /${e}s`,
        ];
      };
      const urls = entities.flatMap(routes);

      const instanceSpans = (instance: Instance, url: string, index: number) => {
        const successfulTraceEvents = successfulTimestamps.generator((timestamp) => {
          const mod = (index % 4) + 1;
          const randomHigh = random(100, mod * 1000, false);
          const randomLow = random(10, randomHigh / 10 + mod * 3, false);
          const duration = random(randomLow, randomHigh, false);
          const childDuration = random(1, duration);
          const remainderDuration = duration - childDuration;
          const generateError = index % random(mod, 9) === 0;
          const generateChildError = index % random(mod, 9) === 0;
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

      return withClient(
        apmEsClient,
        logger.perf('generating_apm_events', () =>
          instances
            .flatMap((instance) => urls.map((url) => ({ instance, url })))
            .map(({ instance, url }, index) => instanceSpans(instance, url, index))
        )
      );
    },
  };
};

export default scenario;
