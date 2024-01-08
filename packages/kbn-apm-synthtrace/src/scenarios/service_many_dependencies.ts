/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ApmFields, Instance } from '@kbn/apm-synthtrace-client';
import { service } from '@kbn/apm-synthtrace-client/src/lib/apm/service';
import { Scenario } from '../cli/scenario';
import { RunOptions } from '../cli/utils/parse_run_cli_flags';
import { getSynthtraceEnvironment } from '../lib/utils/get_synthtrace_environment';
import { withClient } from '../lib/utils/with_client';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);
const MAX_DEPENDENCIES = 10000;
const MAX_DEPENDENCIES_PER_SERVICE = 500;
const MAX_SERVICES = 20;

const scenario: Scenario<ApmFields> = async (runOptions: RunOptions) => {
  return {
    generate: ({ range, clients: { apmEsClient } }) => {
      const javaInstances = Array.from({ length: MAX_SERVICES }).map((_, index) =>
        service(`opbeans-java-${index}`, ENVIRONMENT, 'java').instance(`java-instance-${index}`)
      );

      const instanceDependencies = (instance: Instance, startIndex: number) => {
        const rate = range.ratePerMinute(60);

        return rate.generator((timestamp, index) => {
          const currentIndex = index % MAX_DEPENDENCIES_PER_SERVICE;
          const destination = (startIndex + currentIndex) % MAX_DEPENDENCIES;

          const span = instance
            .transaction({ transactionName: 'GET /java' })
            .timestamp(timestamp)
            .duration(400)
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
                .duration(200)
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
