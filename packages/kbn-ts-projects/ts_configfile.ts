/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';

import { parseConfigFileTextToJson } from 'typescript';

export interface TsConfig {
  extends?: string;
  compilerOptions?: {
    types?: string[];
    [key: string]: unknown;
  };
  include?: string[];
  exclude?: string[];
  kbn_references?: Array<string | { path: string; force?: boolean }>;
  [key: string]: unknown;
}

export function parseTsConfig(tsConfigPath: string, jsonc: string): TsConfig {
  const { error, config } = parseConfigFileTextToJson(tsConfigPath, jsonc);

  if (error) {
    throw new Error(`tsconfig parse error: [${error.file}] ${error.messageText}`);
  }

  return config;
}

export function readTsConfig(tsConfigPath: string): TsConfig {
  try {
    return parseTsConfig(tsConfigPath, Fs.readFileSync(tsConfigPath, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') {
      const err = new Error(
        `unable to read tsconfig file at ${tsConfigPath}. File does not exist.`
      );
      Object.assign(err, { code: error.code });
      throw err;
    }

    throw error;
  }
}
