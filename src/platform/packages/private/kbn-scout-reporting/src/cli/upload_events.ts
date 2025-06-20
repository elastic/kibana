/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'node:fs';
import path from 'node:path';
import { Command } from '@kbn/dev-cli-runner';
import { createFlagError } from '@kbn/dev-cli-errors';
import {
  SCOUT_REPORTER_ES_URL,
  SCOUT_REPORTER_ES_API_KEY,
  SCOUT_REPORTER_ES_VERIFY_CERTS,
  SCOUT_REPORT_OUTPUT_ROOT,
} from '@kbn/scout-info';
import { ScoutReportDataStream } from '../reporting/report/events';
import { getValidatedESClient } from '../helpers/elasticsearch';

export const uploadEvents: Command<void> = {
  name: 'upload-events',
  description: 'Upload events recorded by the Scout reporter to Elasticsearch',
  flags: {
    string: ['eventLogPath', 'esURL', 'esAPIKey'],
    boolean: ['verifyTLSCerts'],
    default: {
      esURL: SCOUT_REPORTER_ES_URL,
      esAPIKey: SCOUT_REPORTER_ES_API_KEY,
      verifyTLSCerts: SCOUT_REPORTER_ES_VERIFY_CERTS,
    },
    help: `
    --eventLogPath    (optional)  Path to the event log to upload. If no path is provided, all events within the Scout reports output directory will be uploaded.
    --esURL           (required)  Elasticsearch URL [env: SCOUT_REPORTER_ES_URL]
    --esAPIKey        (required)  Elasticsearch API Key [env: SCOUT_REPORTER_ES_API_KEY]
    --verifyTLSCerts  (optional)  Verify TLS certificates [env: SCOUT_REPORTER_ES_VERIFY_CERTS]
    `,
  },
  run: async ({ flagsReader, log }) => {
    // Read & validate CLI options
    let eventLogPath = flagsReader.string('eventLogPath');

    if (!eventLogPath) {
      // Default to the SCOUT_REPORT_OUTPUT_ROOT directory if no path is provided
      eventLogPath = SCOUT_REPORT_OUTPUT_ROOT;
    }

    if (!fs.existsSync(eventLogPath)) {
      const label =
        eventLogPath === SCOUT_REPORT_OUTPUT_ROOT
          ? 'The Scout reports output directory'
          : 'The provided event log path';
      throw createFlagError(`${label} '${eventLogPath}' does not exist.`);
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
      { log, cli: true }
    );

    // Event log upload
    const reportDataStream = new ScoutReportDataStream(es, log);

    // If the path is a directory, gather all .ndjson files recursively
    if (fs.statSync(eventLogPath).isDirectory()) {
      const resolvedPath = path.resolve(eventLogPath);

      const files = fs
        .readdirSync(resolvedPath, { recursive: true })
        .filter((file: string) => file.endsWith('.ndjson'))
        .map((file: string) => path.join(resolvedPath, file));
      log.info(`Found ${files.length} event log files in '${resolvedPath}'`);

      for (const file of files) {
        await reportDataStream.addEventsFromFile(file);
      }
    } else {
      await reportDataStream.addEventsFromFile(eventLogPath);
    }
  },
};
