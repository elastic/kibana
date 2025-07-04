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
} from '@kbn/scout-info';
import { ScoutReportDataStream } from '../reporting/report/events';
import { getValidatedESClient } from '../helpers/elasticsearch';

export const initializeReportDatastream: Command<void> = {
  name: 'initialize-report-datastream',
  description: 'Initialize a Scout report datastream in Elasticsearch',
  flags: {
    string: ['esURL', 'esAPIKey'],
    boolean: ['verifyTLSCerts'],
    default: {
      esURL: SCOUT_REPORTER_ES_URL,
      esAPIKey: SCOUT_REPORTER_ES_API_KEY,
      verifyTLSCerts: SCOUT_REPORTER_ES_VERIFY_CERTS,
    },
    help: `
    --esURL           (required)  Elasticsearch URL [env: SCOUT_REPORTER_ES_URL]
    --esAPIKey        (required)  Elasticsearch API Key [env: SCOUT_REPORTER_ES_API_KEY]
    --verifyTLSCerts  (optional)  Verify TLS certificates [env: SCOUT_REPORTER_ES_VERIFY_CERTS]
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

    // Initialize the report datastream
    const reportDataStream = new ScoutReportDataStream(es, log);
    await reportDataStream.initialize();

    log.success('Scout report data stream initialized');
  },
};
