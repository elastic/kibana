/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'node:path';
import { existsSync } from 'node:fs';
import { execFileSync } from 'child_process';
import type { OasdiffEntry } from './parse_oasdiff';

const DIFF_TIMEOUT = 240_000;
const MAX_BUFFER = 50 * 1024 * 1024;

const validateFilePath = (filePath: string, label: string): void => {
  if (!path.isAbsolute(filePath)) {
    throw new Error(`${label} must be an absolute path, got: ${filePath}`);
  }
  if (!existsSync(filePath)) {
    throw new Error(`${label} does not exist: ${filePath}`);
  }
};

export const runOasdiff = (basePath: string, currentPath: string): OasdiffEntry[] => {
  validateFilePath(basePath, 'basePath');
  validateFilePath(currentPath, 'currentPath');

  const bin = process.env.OASDIFF_BIN ?? 'oasdiff';
  let output: string;

  try {
    output = execFileSync(bin, ['breaking', basePath, currentPath, '--format', 'json'], {
      encoding: 'utf-8',
      maxBuffer: MAX_BUFFER,
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: DIFF_TIMEOUT,
    });
  } catch (error: unknown) {
    if ((error as { status?: number }).status === 1) {
      output = (error as { stdout?: string }).stdout ?? '';
    } else {
      throw error;
    }
  }

  const trimmed = output.trim();
  if (!trimmed || trimmed === '[]') {
    return [];
  }
  return JSON.parse(trimmed) as OasdiffEntry[];
};
