/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ApmFields, apm } from '@kbn/apm-synthtrace-client';
import { random } from 'lodash';
import { pipeline, Readable } from 'stream';
import semver from 'semver';
import { Scenario } from '../cli/scenario';
import {
  addObserverVersionTransform,
  deleteSummaryFieldTransform,
} from '../lib/utils/transform_helpers';
import { withClient } from '../lib/utils/with_client';

const scenario: Scenario<ApmFields> = async ({ logger, versionOverride }) => {
  const version = versionOverride as string;
  const isLegacy = versionOverride && semver.lt(version, '8.7.0');
  return {
    bootstrap: async ({ apmEsClient }) => {
      if (isLegacy) {
        apmEsClient.pipeline((base: Readable) => {
          const defaultPipeline = apmEsClient.getDefaultPipeline()(
            base
          ) as unknown as NodeJS.ReadableStream;

          return pipeline(
            defaultPipeline,
            addObserverVersionTransform(version),
            deleteSummaryFieldTransform(),
            (err) => {
              if (err) {
                logger.error(err);
              }
            }
          );
        });
      }
    },
    generate: ({ range, clients: { apmEsClient } }) => {
      const successfulTimestamps = range.ratePerMinute(6);
      const instance = apm
        .service({
          name: `java${isLegacy ? '-legacy' : ''}`,
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
