/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/** ***********************************************************
 *
 *  Run `node scripts/extract_performance_testing_dataset --help` for usage information
 *
 *************************************************************/

import { run } from '@kbn/dev-cli-runner';
import { createFlagError } from '@kbn/dev-cli-errors';
import { reporter } from './reporter';

export async function runCli() {
  run(
    async ({ log, flags }) => {
      const apmBaseUrl = flags['apm-url'];
      if (apmBaseUrl && typeof apmBaseUrl !== 'string') {
        throw createFlagError('--apm-url must be a string');
      }
      if (!apmBaseUrl) {
        throw createFlagError('--apm-url must be defined');
      }

      const apmUsername = flags['apm-username'];
      if (apmUsername && typeof apmUsername !== 'string') {
        throw createFlagError('--apm-username must be a string');
      }
      if (!apmUsername) {
        throw createFlagError('--apm-username must be defined');
      }

      const apmPassword = flags['apm-password'];
      if (apmPassword && typeof apmPassword !== 'string') {
        throw createFlagError('--apm-password must be a string');
      }
      if (!apmPassword) {
        throw createFlagError('--apm-password must be defined');
      }

      const buildId = flags.buildId;
      if (buildId && typeof buildId !== 'string') {
        throw createFlagError('--buildId must be a string');
      }
      if (!buildId) {
        throw createFlagError('--buildId must be defined');
      }

      return reporter({
        apmClient: {
          auth: {
            username: apmUsername,
            password: apmPassword,
          },
          baseURL: apmBaseUrl,
        },
        param: {
          ciBuildId: buildId,
        },
        log,
      });
    },
    {
      description: `CLI to fetch performance metrics and report those to ci-stats`,
      flags: {
        string: ['buildId', 'apm-url', 'apm-username', 'apm-password'],
        help: `
           --buildId          BUILDKITE_JOB_ID or uuid generated locally, stored in APM-based document as label: 'labels.testBuildId'
           --apm-url          url for APM cluster
           --apm-username     username for Apm
           --apm-password     password for Apm
         `,
      },
    }
  );
}
