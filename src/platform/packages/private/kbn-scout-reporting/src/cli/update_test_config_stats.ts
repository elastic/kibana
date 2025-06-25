/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Command } from '@kbn/dev-cli-runner';
import {
  SCOUT_REPORTER_ES_API_KEY,
  SCOUT_REPORTER_ES_URL,
  SCOUT_REPORTER_ES_VERIFY_CERTS,
  SCOUT_TEST_CONFIG_STATS_PATH,
} from '@kbn/scout-info';
import { ScoutTestConfigStats } from '../reporting/stats/test_config';
import { getValidatedESClient } from '../helpers/elasticsearch';

export const updateTestConfigStats: Command<void> = {
  name: 'update-test-config-stats',
  description: `Fetch latest test config stats from Scout test events and store them locally under ${SCOUT_TEST_CONFIG_STATS_PATH}`,
  flags: {
    string: ['esURL', 'esAPIKey', 'lookbackDays', 'branch', 'pipelineSlug'],
    boolean: ['verifyTLSCerts'],
    default: {
      esURL: SCOUT_REPORTER_ES_URL,
      esAPIKey: SCOUT_REPORTER_ES_API_KEY,
      verifyTLSCerts: SCOUT_REPORTER_ES_VERIFY_CERTS,
      lookbackDays: '1',
      pipelineSlug: 'kibana-pull-request',
    },
    help: `
    --esURL           (required)  Elasticsearch URL [env: SCOUT_REPORTER_ES_URL]
    --esAPIKey        (required)  Elasticsearch API Key [env: SCOUT_REPORTER_ES_API_KEY]
    --verifyTLSCerts  (optional)  Verify TLS certificates [env: SCOUT_REPORTER_ES_VERIFY_CERTS]
    --lookbackDays    (optional)  How many days to look back when aggregating stats (default: 1)
    --branch          (optional)  Only look at events from a particular branch
    --pipelineSlug    (optional)  Only look at events from a particular pipeline (default: kibana-pull-request)
    `,
  },
  run: async ({ flagsReader, log }) => {
    const esURL = flagsReader.requiredString('esURL');
    const esAPIKey = flagsReader.requiredString('esAPIKey');

    // ES connection
    log.info(`Connecting to Elasticsearch at ${esURL}`);
    const es = await getValidatedESClient(
      {
        node: esURL,
        auth: { apiKey: esAPIKey },
        tls: {
          rejectUnauthorized: flagsReader.boolean('verifyTLSCerts'),
        },
      },
      { log, cli: true }
    );

    // Fetch stats
    const lookbackDays = flagsReader.requiredNumber('lookbackDays');
    const branch = flagsReader.string('branch');
    const pipelineSlug = flagsReader.requiredString('pipelineSlug');

    log.info(
      `Fetching stats over the past ${lookbackDays}d` +
        ` (branch: ${branch || 'any'}, pipeline: ${pipelineSlug})`
    );

    const testConfigStats = await ScoutTestConfigStats.fromElasticsearch(es, {
      configPaths: [],
      lookbackDays,
      buildkite: { branch, pipelineSlug },
    });

    // Write stats
    log.info(`Writing test config stats to ${SCOUT_TEST_CONFIG_STATS_PATH}`);
    testConfigStats.writeToFile(SCOUT_TEST_CONFIG_STATS_PATH);

    log.success(`Finished in ${(performance.now() / 1000).toFixed(2)}s`);
  },
};
