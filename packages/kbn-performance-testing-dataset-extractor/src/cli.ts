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
import { extractor } from './extractor';

export async function runExtractor() {
  run(
    async ({ log, flags }) => {
      const baseURL = flags['es-url'];
      if (baseURL && typeof baseURL !== 'string') {
        throw createFlagError('--es-url must be a string');
      }
      if (!baseURL) {
        throw createFlagError('--es-url must be defined');
      }

      const username = flags['es-username'];
      if (username && typeof username !== 'string') {
        throw createFlagError('--es-username must be a string');
      }
      if (!username) {
        throw createFlagError('--es-username must be defined');
      }

      const password = flags['es-password'];
      if (password && typeof password !== 'string') {
        throw createFlagError('--es-password must be a string');
      }
      if (!password) {
        throw createFlagError('--es-password must be defined');
      }

      const journeyName = flags.journeyName;
      if (journeyName && typeof journeyName !== 'string') {
        throw createFlagError('--journeyName must be a string');
      }
      if (!journeyName) {
        throw createFlagError('--journeyName must be defined');
      }

      const buildId = flags.buildId;
      if (buildId && typeof buildId !== 'string') {
        throw createFlagError('--buildId must be a string');
      }
      if (!buildId) {
        throw createFlagError('--buildId must be defined');
      }

      return extractor({
        param: { journeyName, buildId },
        client: { baseURL, username, password },
        log,
      });
    },
    {
      description: `CLI to fetch and normalize APM traces for journey scalability testing`,
      flags: {
        string: ['journeyName', 'buildId', 'es-url', 'es-username', 'es-password'],
        help: `
          --journeyName      Single user performance journey name, stored in APM-based document as label: 'labels.journeyName'
          --buildId          BUILDKITE_JOB_ID or uuid generated locally, stored in APM-based document as label: 'labels.testBuildId'
          --es-url           url for Elasticsearch (APM cluster)
          --es-username      username for Elasticsearch (APM cluster)
          --es-password      password for Elasticsearch (APM cluster)
        `,
      },
    }
  );
}
