/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ApmFields, Instance } from '@kbn/apm-synthtrace-client';
import { service } from '@kbn/apm-synthtrace-client/src/lib/apm/service';
import { random } from 'lodash';
import { Scenario } from '../cli/scenario';
import { RunOptions } from '../cli/utils/parse_run_cli_flags';
import { getSynthtraceEnvironment } from '../lib/utils/get_synthtrace_environment';
import { withClient } from '../lib/utils/with_client';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);
const MAX_DEPENDENCIES = 10000;
const MAX_DEPENDENCIES_PER_SERVICE = 500;

const scenario: Scenario<ApmFields> = async (runOptions: RunOptions) => {
  return {
    generate: ({ range, clients: { apmEsClient } }) => {
      const javaInstances = Array.from({ length: 65 }).map((_, index) =>
        service(`opbeans-java-${index}`, ENVIRONMENT, 'java').instance(`java-instance-${index}`)
      );

      const instanceDependencies = (instance: Instance, startIndex: number) => {
        const rate = range.ratePerMinute(60);
        const high = 1000;
        const randomLow = random(100, high / 3);
        const duration = random(randomLow, high);
        const childDuration = random(randomLow, duration);

        return rate.generator((timestamp, index) => {
          const count = index % MAX_DEPENDENCIES_PER_SERVICE;
          const destination = (startIndex + count) % MAX_DEPENDENCIES;

          const span = instance
            .transaction({ transactionName: 'GET /java' })
            .timestamp(timestamp)
            .duration(duration)
            .success()
            .children(
              instance
                .span({
                  spanName: 'GET apm-*/_search',
                  spanType: 'db',
                  spanSubtype: 'elasticsearch',
                })
                .destination(`elasticsearch/${destination}`)
                .timestamp(timestamp)
                .duration(childDuration)
                .success()
            );

          return span;
        });
      };

      return withClient(
        apmEsClient,
        javaInstances.map((instance, index) =>
          instanceDependencies(instance, (index * MAX_DEPENDENCIES_PER_SERVICE) % MAX_DEPENDENCIES)
        )
      );
    },
  };
};

export default scenario;
