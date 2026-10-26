/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createWriteStream } from 'fs';
import { rm } from 'fs/promises';
import https from 'https';
import { pipeline } from 'stream/promises';

export async function downloadFile(url: string, outputPath: string): Promise<void> {
  try {
    await new Promise<void>((resolve, reject) => {
      https
        .get(url, (response) => {
          if (response.statusCode !== 200) {
            response.resume();
            reject(new Error(`HTTP ${response.statusCode} ${response.statusMessage ?? ''}`.trim()));
            return;
          }

          pipeline(response, createWriteStream(outputPath)).then(resolve, reject);
        })
        .on('error', reject);
    });
  } catch (error) {
    await rm(outputPath, { force: true });
    throw new Error(
      `Failed to download Saved Objects snapshot from ${url}: ${
        error instanceof Error ? error.message : String(error)
      }`,
      { cause: error }
    );
  }
}
