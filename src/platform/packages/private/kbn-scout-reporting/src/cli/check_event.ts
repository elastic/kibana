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
  SCOUT_TEST_EVENTS_DATA_STREAM_NAME,
} from '@kbn/scout-info';
import { getValidatedESClient } from '../helpers/elasticsearch';

export const checkEventCommand: Command<void> = {
  name: 'check-event',
  description:
    'Check if a specific event exists in Elasticsearch for a given build and test config',
  flags: {
    string: ['buildNumber', 'testConfig', 'esURL', 'esAPIKey'],
    boolean: ['verifyTLSCerts', 'dontFailOnError'],
    default: {
      esURL: SCOUT_REPORTER_ES_URL,
      esAPIKey: SCOUT_REPORTER_ES_API_KEY,
      verifyTLSCerts: SCOUT_REPORTER_ES_VERIFY_CERTS,
      dontFailOnError: false,
    },
    help: `
    --buildNumber     (required)  The Buildkite build number.
    --testConfig      (required)  The path to the test config file.
    --esURL           (required)  Elasticsearch URL [env: SCOUT_REPORTER_ES_URL]
    --esAPIKey        (required)  Elasticsearch API Key [env: SCOUT_REPORTER_ES_API_KEY]
    --verifyTLSCerts  (optional)  Verify TLS certificates [env: SCOUT_REPORTER_ES_VERIFY_CERTS]
    --dontFailOnError (optional)  If present, errors will be logged but the process will not fail (default: false)
    `,
  },
  run: async ({ flagsReader, log }) => {
    const buildNumber = flagsReader.requiredString('buildNumber');
    const testConfig = flagsReader.requiredString('testConfig');
    const esURL = flagsReader.requiredString('esURL');
    const esAPIKey = flagsReader.requiredString('esAPIKey');
    const verifyTLSCerts = flagsReader.boolean('verifyTLSCerts');
    const dontFailOnError = flagsReader.boolean('dontFailOnError');

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

    log.info(`Checking for event with buildNumber: ${buildNumber} and testConfig: ${testConfig}`);

    try {
      const result = await es.search({
        index: SCOUT_TEST_EVENTS_DATA_STREAM_NAME,
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
              { term: { 'buildkite.build.number': buildNumber } },
              { term: { 'test_run.config.file.path': testConfig } },
            ],
          },
        },
      });

      console.log('Search result:', JSON.stringify(result));
      if ((result.hits.total as any).value > 0) {
        log.success('Event found!');
      } else {
        log.error('Event not found.');
        if (!dontFailOnError) {
          process.exitCode = 1;
        }
      }
    } catch (error) {
      log.error('Error checking for event:');
      log.error(error);
      if (!dontFailOnError) {
        process.exitCode = 1;
      }
    }
  },
};
