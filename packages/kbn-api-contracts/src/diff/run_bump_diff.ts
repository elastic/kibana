/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import path from 'node:path';
import { execFileSync } from 'child_process';
import { REPO_ROOT } from '@kbn/repo-info';
import type { BumpDiffEntry } from './parse_bump_diff';

const OAS_DOCS_DIR = path.resolve(REPO_ROOT, './oas_docs');
const DIFF_TIMEOUT = 240_000;

const BUMP_SERVICE_ERROR_PATTERNS = [
  'unable to compute your documentation diff',
  'please try again later',
  'please contact support at https://bump.sh',
];

export class BumpServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BumpServiceError';
  }
}

const isBumpServiceError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;
  const stderr = ('stderr' in error ? (error as { stderr: string | Buffer }).stderr : '')
    ?.toString()
    .toLowerCase();
  const message = ('message' in error ? (error as Error).message : '').toLowerCase();
  const combined = `${stderr} ${message}`;
  return BUMP_SERVICE_ERROR_PATTERNS.some((pattern) => combined.includes(pattern));
};

export const runBumpDiff = (basePath: string, currentPath: string): BumpDiffEntry[] => {
  try {
    const output = execFileSync(
      'npm',
      ['run', '--silent', 'bump:diff', '--', basePath, currentPath, '--format=json'],
      {
        cwd: OAS_DOCS_DIR,
        encoding: 'utf-8',
        maxBuffer: 50 * 1024 * 1024,
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: DIFF_TIMEOUT,
      }
    );

    const trimmed = output.trim();
    if (!trimmed || trimmed === '[]') {
      return [];
    }
    return JSON.parse(trimmed) as BumpDiffEntry[];
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'stdout' in error) {
      const { stdout, status } = error as { stdout: string; status: number | null };
      // bump-cli exits with code 1 when there are breaking changes but still outputs valid JSON
      if (status === 1 && stdout?.trim()) {
        try {
          return JSON.parse(stdout.trim()) as BumpDiffEntry[];
        } catch {
          // JSON parse failed, fall through (invalid JSON)
        }
      }
    }

    if (isBumpServiceError(error)) {
      throw new BumpServiceError(
        `bump.sh service unavailable — the API diff could not be computed. This is a transient error from the bump.sh external service, not a problem with your PR. Re-running the CI job should resolve this.`
      );
    }

    throw error;
  }
};
