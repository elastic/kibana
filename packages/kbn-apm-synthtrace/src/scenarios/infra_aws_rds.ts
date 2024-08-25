/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { InfraDocument, ApmFields, infra } from '@kbn/apm-synthtrace-client';
import { Scenario } from '../cli/scenario';
import { withClient } from '../lib/utils/with_client';

const numRds = 50;
const scenario: Scenario<InfraDocument | ApmFields> = async (runOptions) => {
  return {
    generate: ({ range, clients: { infraEsClient } }) => {
      const { logger } = runOptions;

      // Infra hosts Data logic

      const RDS = Array(numRds)
        .fill(0)
        .map((_, idx) => infra.awsRds(`redis-${idx}`, `redis-${idx}`));

      const rds = range
        .interval('30s')
        .rate(1)
        .generator((timestamp) =>
          RDS.flatMap((item) => [
            item
              .metrics({
                ...item.fields,
                'aws.rds.cpu.total.pct': 0.4,
                'aws.rds.database_connections': 5,
                'aws.rds.latency.read': 500 * 1000,
                'aws.rds.latency.write': 500 * 1000,
                'aws.rds.latency.insert': 500 * 1000,
                'aws.rds.latency.update': 500 * 1000,
                'aws.rds.latency.commit': 500 * 1000,
                'aws.rds.latency.dml': 500 * 1000,
                'aws.rds.queries': 100,
              })
              .timestamp(timestamp),
          ])
        );

      return [
        withClient(
          infraEsClient,
          logger.perf('generating_infra_aws_rds', () => rds)
        ),
      ];
    },
  };
};

export default scenario;
