/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import Fs from 'fs';
import pRetry from 'p-retry';
import type { ToolingLog } from '@kbn/tooling-log';

export async function waitForResultsFile(resultsPath: string, log: ToolingLog): Promise<void> {
  const startTime = Date.now();

  try {
    await pRetry(
      async () => {
        // Check if file exists
        await Fs.promises.access(resultsPath, Fs.constants.F_OK);

        // Try to read and parse the file
        const content = await Fs.promises.readFile(resultsPath, 'utf8');

        // Ensure it's valid JSON and not empty
        if (!content.trim()) {
          throw new Error('File is empty');
        }

        const parsed = JSON.parse(content);
        // Basic validation that it looks like Jest results
        if (!parsed || typeof parsed !== 'object') {
          throw new Error('Invalid JSON structure');
        }

        log.debug(`Results file ready after ${Date.now() - startTime}ms`);
      },
      {
        retries: 300, // 300 retries * 100ms = 30 seconds maximum wait time
        minTimeout: 100, // 100ms between retries
        maxTimeout: 100, // Keep consistent 100ms interval
        factor: 1, // No exponential backoff, keep consistent timing
      }
    );
  } catch (error) {
    throw new Error(`Results file not ready after 30 seconds`);
  }
}
