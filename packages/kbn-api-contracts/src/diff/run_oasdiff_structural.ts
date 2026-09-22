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

const DIFF_TIMEOUT = 240_000;
const MAX_BUFFER = 50 * 1024 * 1024;

interface OasdiffStructuralOptions {
  matchPath?: string;
}

const assertAbsoluteExistingPath = (filePath: string, label: string): void => {
  if (!path.isAbsolute(filePath)) {
    throw new Error(`${label} must be an absolute path, got: ${filePath}`);
  }
  if (!existsSync(filePath)) {
    throw new Error(`${label} does not exist: ${filePath}`);
  }
};

// Note: we intentionally do NOT pass --flatten-allof. On the full Kibana
// spec, oasdiff 1.15.1 stack-overflows during allOf flattening. Instead, the
// detector walks `allOf.modified[i].diff` branches itself, alongside
// `oneOf` and `anyOf`.
const buildArgs = (
  basePath: string,
  currentPath: string,
  options?: OasdiffStructuralOptions
): string[] => [
  'diff',
  basePath,
  currentPath,
  '--format',
  'json',
  ...(options?.matchPath ? ['--match-path', options.matchPath] : []),
];

const execOasdiff = (bin: string, args: string[]): string => {
  try {
    return execFileSync(bin, args, {
      encoding: 'utf-8',
      maxBuffer: MAX_BUFFER,
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: DIFF_TIMEOUT,
    });
  } catch (error: unknown) {
    if ((error as { status?: number }).status === 1) {
      return (error as { stdout?: string }).stdout ?? '';
    }
    throw error;
  }
};

export const runOasdiffStructural = (
  basePath: string,
  currentPath: string,
  options?: OasdiffStructuralOptions
): unknown => {
  assertAbsoluteExistingPath(basePath, 'basePath');
  assertAbsoluteExistingPath(currentPath, 'currentPath');

  const bin = process.env.OASDIFF_BIN ?? 'oasdiff';
  const output = execOasdiff(bin, buildArgs(basePath, currentPath, options)).trim();
  return output ? JSON.parse(output) : {};
};
