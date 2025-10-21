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

import type { Command } from '@kbn/dev-cli-runner';
import { createFlagError } from '@kbn/dev-cli-errors';
import type { ToolingLog } from '@kbn/tooling-log';

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

export interface EventUploadOptions {
  esURL: string;
  esAPIKey: string;
  verifyTLSCerts: boolean;
  log: ToolingLog;
}

export const uploadAllEventsFromPath = async (
  eventLogPath: string,
  options: EventUploadOptions
) => {
  // Validate CLI options
  if (!fs.existsSync(eventLogPath)) {
    throw createFlagError(`The provided event log path '${eventLogPath}' does not exist.`);
  }

  // If the provided event log path is a file, ensure it ends with .ndjson
  if (!fs.statSync(eventLogPath).isDirectory()) {
    if (!eventLogPath.endsWith('.ndjson')) {
      throw createFlagError(`The provided event log file '${eventLogPath}' must end with .ndjson.`);
    }
  }

  // ES connection
  options.log.info(`Connecting to Elasticsearch at ${options.esURL}`);
  const es = await getValidatedESClient(
    {
      node: options.esURL,
      auth: { apiKey: options.esAPIKey },
      tls: {
        rejectUnauthorized: options.verifyTLSCerts,
      },
    },
    { log: options.log, cli: true }
  );

  // Event log upload
  const reportDataStream = new ScoutReportDataStream(es, options.log);

  if (fs.statSync(eventLogPath).isDirectory()) {
    const ndjsonFilePaths: string[] = [];

    readFilesRecursively(eventLogPath, (filePath: string) => {
      if (filePath.endsWith('.ndjson')) {
        ndjsonFilePaths.push(filePath);
      }
    });

    if (ndjsonFilePaths.length === 0) {
      options.log.warning(`No .ndjson event log files found in directory '${eventLogPath}'.`);
    } else {
      options.log.info(
        `Recursively found ${ndjsonFilePaths.length} .ndjson event log file${
          ndjsonFilePaths.length === 1 ? '' : 's'
        } in directory '${eventLogPath}'.`
      );

      await reportDataStream.addEventsFromFile(...ndjsonFilePaths);
    }
  } else if (eventLogPath.endsWith('.ndjson')) {
    await reportDataStream.addEventsFromFile(eventLogPath);
  }
};

export const nonThrowingUploadAllEventsFromPath = async (
  eventLogPath: string,
  options: EventUploadOptions
) => {
  try {
    await uploadAllEventsFromPath(eventLogPath, options);
  } catch (error) {
    options.log.warning(`An error was suppressed: ${error.message}`);
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
    // default to Scout report output directory if no eventLogPath is provided
    const eventLogPath = flagsReader.string('eventLogPath') || SCOUT_REPORT_OUTPUT_ROOT;
    const dontFailOnError = flagsReader.boolean('dontFailOnError');
    const eventUploadOptions: EventUploadOptions = {
      esURL: flagsReader.requiredString('esURL'),
      esAPIKey: flagsReader.requiredString('esAPIKey'),
      verifyTLSCerts: flagsReader.boolean('verifyTLSCerts'),
      log,
    };

    await (dontFailOnError ? nonThrowingUploadAllEventsFromPath : uploadAllEventsFromPath)(
      eventLogPath,
      eventUploadOptions
    );
  },
};
