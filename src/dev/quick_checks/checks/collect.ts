/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isAbsolute, join } from 'path';
import { readdirSync, readFileSync } from 'fs';
import { REPO_ROOT } from '@kbn/repo-info';
import type { QuickCheck, CheckToRun } from '../types';
import { QUICK_CHECKS_LIST } from '../config';

interface CollectOptions {
  targetFile?: string;
  targetDir?: string;
  checks?: string;
}

/**
 * Collect the list of scripts/checks to run based on CLI arguments
 */
export function collectScriptsToRun(options: CollectOptions): QuickCheck[] {
  const { targetFile, targetDir, checks } = options;

  if ([targetFile, targetDir, checks].filter(Boolean).length > 1) {
    throw new Error('Only one of --file, --dir, or --checks can be used at a time.');
  }

  if (targetDir) {
    const targetDirAbsolute = isAbsolute(targetDir) ? targetDir : join(REPO_ROOT, targetDir);

    return readdirSync(targetDirAbsolute).map((file) => ({ script: join(targetDir, file) }));
  }

  if (checks) {
    return checks
      .trim()
      .split(/[,\n]/)
      .map((script) => ({ script: script.trim() }));
  }

  // Default: read from quick_checks.json
  const targetFileWithDefault = targetFile || QUICK_CHECKS_LIST;

  const targetFileAbsolute = isAbsolute(targetFileWithDefault)
    ? targetFileWithDefault
    : join(REPO_ROOT, targetFileWithDefault);

  const fileContent = readFileSync(targetFileAbsolute, 'utf-8');

  // Support both JSON and legacy plain text formats for backward compatibility
  if (targetFileAbsolute.endsWith('.json')) {
    return JSON.parse(fileContent) as QuickCheck[];
  }

  // Legacy plain text format
  return fileContent
    .trim()
    .split('\n')
    .map((line) => ({ script: line.trim() }));
}

/**
 * Prepare checks for execution by resolving paths and mapping to CheckToRun format
 */
export function prepareChecks(checksToRun: QuickCheck[]): CheckToRun[] {
  return checksToRun.map((check) => ({
    script: isAbsolute(check.script) ? check.script : join(REPO_ROOT, check.script),
    nodeCommand: check.nodeCommand,
    filesArg: check.filesArg,
    pathArg: check.pathArg,
    packagesArg: check.packagesArg,
    positionalPackages: check.positionalPackages,
    mayChangeFiles: check.mayChangeFiles,
  }));
}
