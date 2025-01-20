/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'node:fs';
import { Command } from '@kbn/dev-cli-runner';
import { createFlagError } from '@kbn/dev-cli-errors';
import { ScoutReportDataStream } from '../reporting/report/events';
import { getValidatedESClient } from './common';

export const uploadEvents: Command<void> = {
  name: 'upload-events',
  description: 'Upload events recorded by the Scout reporter to Elasticsearch',
  flags: {
    string: ['eventLogPath', 'esURL', 'esAPIKey'],
    boolean: ['verifyTLSCerts'],
    default: {
      esURL: process.env.ES_URL,
      esAPIKey: process.env.ES_API_KEY,
    },
    help: `
    --eventLogPath    (required)  Path to the event log to upload
    --esURL           (required)  Elasticsearch URL [env: ES_URL]
    --esAPIKey        (required)  Elasticsearch API Key [env: ES_API_KEY]
    --verifyTLSCerts  (optional)  Verify TLS certificates
    `,
  },
  run: async ({ flagsReader, log }) => {
    // Read & validate CLI options
    const eventLogPath = flagsReader.requiredString('eventLogPath');

    if (!fs.existsSync(eventLogPath)) {
      throw createFlagError(`Event log path '${eventLogPath}' does not exist.`);
    }

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
      log
    );

    // Event log upload
    const reportDataStream = new ScoutReportDataStream(es, log);
    await reportDataStream.addEventsFromFile(eventLogPath);
  },
};
