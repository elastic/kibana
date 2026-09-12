/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import path from 'path';
import { createFailError } from '@kbn/dev-cli-errors';
import { REPO_ROOT } from '@kbn/repo-info';

/**
 * Generic input artifact handed to Scout selective-testing logic by the
 * Buildkite layer. Contains everything Scout needs to make a selective-testing
 * decision without having to call git/repo tooling itself.
 */
export interface CodeChanges {
  /** Git ref the diff was computed against. */
  mergeBase: string;
  /** Repo-relative paths of files changed since `mergeBase`. */
  changedFiles: string[];
  /** @kbn/ module IDs identified as affected by the changed files (downstream-included). */
  affectedModules: string[];
}

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === 'string');

const isCodeChanges = (value: unknown): value is CodeChanges => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.mergeBase === 'string' &&
    isStringArray(candidate.changedFiles) &&
    isStringArray(candidate.affectedModules)
  );
};

/**
 * Read and validate a code-changes JSON file produced by the Buildkite Scout
 * resolver. Throws (via createFailError) on missing/invalid input — selective
 * testing must not silently fall back to a wrong mode.
 */
export const readCodeChanges = (filePath: string): CodeChanges => {
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(REPO_ROOT, filePath);
  let content: string;
  try {
    content = fs.readFileSync(absolutePath, 'utf-8');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw createFailError(`Failed to read code-changes file '${filePath}': ${message}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw createFailError(`Code-changes file is not valid JSON ('${filePath}'): ${message}`);
  }

  if (!isCodeChanges(parsed)) {
    throw createFailError(
      `Code-changes file '${filePath}' must contain { mergeBase: string, changedFiles: string[], affectedModules: string[] }`
    );
  }

  return parsed;
};
