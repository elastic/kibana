/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ApmFields, apm } from '@kbn/apm-synthtrace-client';
import { random } from 'lodash';
import { Readable } from 'stream';
import semver from 'semver';
import { Scenario } from '../cli/scenario';
import { withClient } from '../lib/utils/with_client';
import { RunOptions } from '../cli/utils/parse_run_cli_flags';
import { Logger } from '../lib/utils/create_logger';

const scenario: Scenario<ApmFields> = async ({
  logger,
  versionOverride,
}: RunOptions & { logger: Logger }) => {
  const version = versionOverride as string;
  const isLegacy = version ? semver.lt(version as string, '8.7.0') : false;
  return {
    bootstrap: async ({ apmEsClient }) => {
      if (isLegacy) {
        apmEsClient.pipeline((base: Readable) => {
          return apmEsClient.getDefaultPipeline({
            versionOverride: version,
          })(base);
        });
      }
    },
    generate: ({ range, clients: { apmEsClient } }) => {
      const successfulTimestamps = range.ratePerMinute(6);
      const instance = apm
        .service({
          name: `java`,
          environment: 'production',
          agentName: 'java',
        })
        .instance(`instance`);

      return withClient(
        apmEsClient,
        successfulTimestamps.generator((timestamp) => {
          const randomHigh = random(1000, 4000);
          const randomLow = random(100, randomHigh / 5);
          const duration = random(randomLow, randomHigh);
          return instance
            .transaction({ transactionName: 'GET /order/{id}' })
            .timestamp(timestamp)
            .duration(duration)
            .success();
        })
      );
    },
  };
};

export default scenario;
