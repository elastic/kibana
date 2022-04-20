/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { random } from 'lodash';
import { apm, timerange } from '../..';
import { ApmFields } from '../../lib/apm/apm_fields';
import { Instance } from '../../lib/apm/instance';
import { Scenario } from '../scenario';
import { getLogger } from '../utils/get_common_services';
import { RunOptions } from '../utils/parse_run_cli_flags';

const scenario: Scenario<ApmFields> = async (runOptions: RunOptions) => {
  const logger = getLogger(runOptions);

  const numServices = 3;
  const languages = ['go', 'dotnet', 'java', 'python'];
  const services = ['web', 'order-processing', 'api-backend', 'proxy'];

  return {
    generate: ({ from, to }) => {
      const range = timerange(from, to);

      const successfulTimestamps = range.interval('1s').rate(1);
      // `.randomize(3, 180);

      const instances = [...Array(numServices).keys()].map((index) =>
        apm
          .service(
            `${services[index % services.length]}-${languages[index % languages.length]}-${index}`,
            'production',
            languages[index % languages.length]
          )
          .instance('instance')
      );

      const urls = ['GET /order/{id}', 'POST /basket/{id}', 'DELETE /basket', 'GET /products'];

      const instanceSpans = (instance: Instance, url: string, index: number) => {
        const successfulTraceEvents = successfulTimestamps.generator((timestamp) => {
          const mod = index % 4;
          const randomHigh = random(100, mod * 1000);
          const randomLow = random(10, randomHigh / 10 + mod * 3);
          const duration = random(randomLow, randomHigh);
          const childDuration = random(randomLow, duration);
          const remainderDuration = duration - childDuration;
          const generateError = index % random(mod, 9) === 0;
          const generateChildError = index % random(mod, 9) === 0;
          const span = instance
            .transaction(url)
            .timestamp(timestamp)
            .duration(duration)
            .children(
              instance
                .span('GET apm-*/_search', 'db', 'elasticsearch')
                .duration(childDuration)
                .destination('elasticsearch')
                .timestamp(timestamp)
                .outcome(generateError && generateChildError ? 'failure' : 'success'),
              instance
                .span('custom_operation', 'custom')
                .duration(remainderDuration)
                .success()
                .timestamp(timestamp + childDuration)
            );
          return !generateError
            ? span.success()
            : span
                .failure()
                .errors(instance.error(`No handler for ${url}`).timestamp(timestamp + 50));
        });

        return successfulTraceEvents;
      };

      return instances
        .flatMap((instance) => urls.map((url) => ({ instance, url })))
        .map(({ instance, url }, index) =>
          logger.perf('generating_apm_events', () => instanceSpans(instance, url, index))
        )
        .reduce((p, c) => p.merge(c));
    },
  };
};

export default scenario;
