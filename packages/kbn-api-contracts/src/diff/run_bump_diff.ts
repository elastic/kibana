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
import { REPO_ROOT } from '@kbn/repo-info';
import type { BumpDiffEntry } from './parse_bump_diff';
import { toBumpDiffError } from './errors';

const OAS_DOCS_DIR = path.resolve(REPO_ROOT, './oas_docs');
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

export const runBumpDiff = (basePath: string, currentPath: string): BumpDiffEntry[] => {
  validateFilePath(basePath, 'basePath');
  validateFilePath(currentPath, 'currentPath');

  try {
    const output = execFileSync(
      'npm',
      ['run', '--silent', 'bump:diff', '--', basePath, currentPath, '--format=json'],
      {
        cwd: OAS_DOCS_DIR,
        encoding: 'utf-8',
        maxBuffer: MAX_BUFFER,
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

    return toBumpDiffError(error);
  }
};
