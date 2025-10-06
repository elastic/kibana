/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Command } from '@kbn/dev-cli-runner';
import {
  SCOUT_REPORTER_ES_URL,
  SCOUT_REPORTER_ES_API_KEY,
  SCOUT_REPORTER_ES_VERIFY_CERTS,
} from '@kbn/scout-info';
import { getValidatedESClient } from '../helpers/elasticsearch';

export const checkEventCommand: Command<void> = {
  name: 'check-event',
  description:
    'Check if a specific event exists in Elasticsearch for a given build and test config',
  flags: {
    string: ['buildId', 'testConfig', 'esURL', 'esAPIKey'],
    boolean: ['verifyTLSCerts'],
    default: {
      esURL: SCOUT_REPORTER_ES_URL,
      esAPIKey: SCOUT_REPORTER_ES_API_KEY,
      verifyTLSCerts: SCOUT_REPORTER_ES_VERIFY_CERTS,
    },
    help: `
    --buildId         (required)  The Buildkite build ID.
    --testConfig      (required)  The path to the test config file.
    --esURL           (required)  Elasticsearch URL [env: SCOUT_REPORTER_ES_URL]
    --esAPIKey        (required)  Elasticsearch API Key [env: SCOUT_REPORTER_ES_API_KEY]
    --verifyTLSCerts  (optional)  Verify TLS certificates [env: SCOUT_REPORTER_ES_VERIFY_CERTS]
    `,
  },
  run: async ({ flagsReader, log }) => {
    const buildId = flagsReader.requiredString('buildId');
    const testConfig = flagsReader.requiredString('testConfig');
    const esURL = flagsReader.requiredString('esURL');
    const esAPIKey = flagsReader.requiredString('esAPIKey');
    const verifyTLSCerts = flagsReader.boolean('verifyTLSCerts');

    log.info(`Connecting to Elasticsearch at ${esURL}`);
    const es = await getValidatedESClient(
      {
        node: esURL,
        auth: { apiKey: esAPIKey },
        tls: {
          rejectUnauthorized: verifyTLSCerts,
        },
      },
      { log, cli: true }
    );

    log.info(`Checking for event with buildId: ${buildId} and testConfig: ${testConfig}`);

    const indexName = '.ds-scout-events-v1-*-*';

    try {
      const result = await es.search({
        index: indexName,
        query: {
          bool: {
            filter: [
              {
                range: {
                  '@timestamp': {
                    gte: 'now-1d/d',
                    lte: 'now',
                  },
                },
              },
            ],
            must: [
              { term: { 'buildkite.build.number': buildId } },
              { term: { 'test_run.config.file.path': testConfig } },
            ],
          },
        },
      });

      if ((result.hits.total as any).value > 0) {
        log.success('Event found!');
        process.exitCode = 0; // Success
      } else {
        log.error('Event not found.');
        process.exitCode = 1; // Failure
      }
    } catch (error) {
      log.error('Error checking for event:');
      log.error(error);
      process.exitCode = 1;
    }
  },
};
