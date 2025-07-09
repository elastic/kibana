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

import { Command, FlagsReader } from '@kbn/dev-cli-runner';
import { createFlagError } from '@kbn/dev-cli-errors';
import { ToolingLog } from '@kbn/tooling-log';

import {
  SCOUT_REPORTER_ES_URL,
  SCOUT_REPORTER_ES_API_KEY,
  SCOUT_REPORTER_ES_VERIFY_CERTS,
  SCOUT_REPORT_OUTPUT_ROOT,
} from '@kbn/scout-info';
import { ScoutReportDataStream } from '../reporting/report/events';
import { getValidatedESClient } from '../helpers/elasticsearch';

const readFilesRecursively = (directory: string, callback: Function) => {
  const files = fs.readdirSync(directory);
  files.forEach((file) => {
    const filePath = path.join(directory, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      readFilesRecursively(filePath, callback);
    } else if (stat.isFile()) {
      callback(filePath);
    }
  });
};

export const uploadAllEventsFromPath = async (
  esURL: string,
  esAPIKey: string,
  verifyTLSCerts: boolean,
  log: ToolingLog,
  eventLogPath?: string
) => {
  // Validate CLI options
  if (eventLogPath && !fs.existsSync(eventLogPath)) {
    throw createFlagError(`The provided event log path '${eventLogPath}' does not exist.`);
  }

  if (!eventLogPath) {
    // Default to the SCOUT_REPORT_OUTPUT_ROOT directory if no path is provided
    eventLogPath = SCOUT_REPORT_OUTPUT_ROOT;

    if (!fs.existsSync(eventLogPath)) {
      log.info(`No Scout report output directory found at ${eventLogPath}. No events to upload.`);
      return;
    }
  }

  // ES connection

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

  // Event log upload
  const reportDataStream = new ScoutReportDataStream(es, log);

  if (fs.statSync(eventLogPath).isDirectory()) {
    readFilesRecursively(eventLogPath, (filePath: string) => {
      if (filePath.endsWith('.ndjson')) {
        reportDataStream.addEventsFromFile(filePath);
      }
    });
  } else if (eventLogPath.endsWith('.ndjson')) {
    reportDataStream.addEventsFromFile(eventLogPath);
  }
};

export const uploadEvents: Command<void> = {
  name: 'upload-events',
  description: 'Upload events recorded by the Scout reporter to Elasticsearch',
  flags: {
    string: ['eventLogPath', 'esURL', 'esAPIKey'],
    boolean: ['verifyTLSCerts', 'dontFailOnError'],
    default: {
      esURL: SCOUT_REPORTER_ES_URL,
      esAPIKey: SCOUT_REPORTER_ES_API_KEY,
      verifyTLSCerts: SCOUT_REPORTER_ES_VERIFY_CERTS,
      dontFailOnError: false,
    },
    help: `
    --esURL           (required)  Elasticsearch URL [env: SCOUT_REPORTER_ES_URL]
    --esAPIKey        (required)  Elasticsearch API Key [env: SCOUT_REPORTER_ES_API_KEY]
    --verifyTLSCerts  (optional)  Verify TLS certificates [env: SCOUT_REPORTER_ES_VERIFY_CERTS]
    --eventLogPath    (optional)  Path to an event log file or directory. If omitted, all events in the Scout reports output directory will be uploaded
    --dontFailOnError (optional)  If present, errors during upload will be logged but not thrown, allowing the process to complete without failure (default: false)
    `,
  },
  run: async ({ flagsReader, log }) => {
    const esURL = flagsReader.requiredString('esURL');
    const esAPIKey = flagsReader.requiredString('esAPIKey');
    const verifyTLSCerts = flagsReader.boolean('verifyTLSCerts');
    const eventLogPath = flagsReader.string('eventLogPath');
    const dontFailOnError = flagsReader.boolean('dontFailOnError');

    try {
      await uploadAllEventsFromPath(esURL, esAPIKey, verifyTLSCerts, log, eventLogPath);
    } catch (error) {
      log.error(error);

      if (!dontFailOnError) {
        throw error;
      }
    }
  },
};
