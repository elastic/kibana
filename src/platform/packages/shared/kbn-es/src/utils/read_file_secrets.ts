/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fsp from 'fs/promises';

/**
 * Reads `setting=/path/to/file` entries into the base64 map serverless ES expects under
 * `file_secrets`, the file-based equivalent of `elasticsearch-keystore add-file`.
 */
export async function readFileSecrets(
  secureFiles: readonly string[] = []
): Promise<Record<string, string>> {
  const entries = await Promise.all(
    secureFiles.map(async (entry) => {
      const separator = entry.indexOf('=');
      const setting = entry.slice(0, separator).trim();
      const filePath = entry.slice(separator + 1).trim();
      if (separator <= 0 || !setting || !filePath) {
        throw new Error(`Invalid secure file "${entry}", expected "setting=/path/to/file"`);
      }
      const contents = await Fsp.readFile(filePath);
      return [setting, contents.toString('base64')] as const;
    })
  );
  return Object.fromEntries(entries);
}
