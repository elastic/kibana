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
 * Reads the string_secrets map from a serverless secrets JSON file.
 * Returns the key-value pairs that ES expects under state.cluster_secrets.
 */
export async function readStringSecrets(secretsFilePath: string): Promise<Record<string, string>> {
  try {
    const contents = JSON.parse(await Fsp.readFile(secretsFilePath, 'utf-8'));
    return contents.string_secrets;
  } catch (error) {
    throw new Error(`Failed to read string secrets from ${secretsFilePath}`, { cause: error });
  }
}
