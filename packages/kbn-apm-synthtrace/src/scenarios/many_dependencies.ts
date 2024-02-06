/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ApmFields, Instance } from '@kbn/apm-synthtrace-client';
import { service } from '@kbn/apm-synthtrace-client/src/lib/apm/service';
import { random, times } from 'lodash';
import { Scenario } from '../cli/scenario';
import { RunOptions } from '../cli/utils/parse_run_cli_flags';
import { getSynthtraceEnvironment } from '../lib/utils/get_synthtrace_environment';
import { withClient } from '../lib/utils/with_client';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);
const NUMBER_OF_DEPENDENCIES_PER_SERVICE = 2000;
const NUMBER_OF_SERVICES = 1;

const scenario: Scenario<ApmFields> = async (runOptions: RunOptions) => {
  return {
    generate: ({ range, clients: { apmEsClient } }) => {
      const instances = times(NUMBER_OF_SERVICES).map((index) =>
        service({
          name: `synthtrace-high-cardinality-${index}`,
          environment: ENVIRONMENT,
          agentName: 'java',
        }).instance(`java-instance-${index}`)
      );

      const instanceDependencies = (instance: Instance, id: string) => {
        const throughput = random(1, 60);
        const childLatency = random(10, 100_000);
        const parentLatency = childLatency + random(10, 10_000);

        const failureRate = random(0, 100);

        return range.ratePerMinute(throughput).generator((timestamp) => {
          const child = instance
            .span({
              spanName: 'GET apm-*/_search',
              spanType: 'db',
              spanSubtype: 'elasticsearch',
            })
            .destination(`elasticsearch/${id}`)
            .timestamp(timestamp)
            .duration(childLatency);

          const span = instance
            .transaction({ transactionName: 'GET /java' })
            .timestamp(timestamp)
            .duration(parentLatency)
            .success()
            .children(Math.random() * 100 > failureRate ? child.success() : child.failure());

          return span;
        });
      };

      return withClient(
        apmEsClient,
        instances.flatMap((instance, i) =>
          times(NUMBER_OF_DEPENDENCIES_PER_SERVICE)
            .map((j) => instanceDependencies(instance, `${i + 1}.${j + 1}`))
            .flat()
        )
      );
    },
  };
};

export default scenario;
