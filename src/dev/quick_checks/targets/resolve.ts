/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isAbsolute, resolve } from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import { findPackageForPath, type Package } from '@kbn/repo-packages';
import type { ToolingLog } from '@kbn/tooling-log';
import { resolveChangedFilesFromBranch } from '../git/changed_files';
import { findDependentFiles } from './dependents';

export interface TargetResolutionResult {
  targetFiles?: string;
  targetPackages?: string;
}

interface ResolveTargetFilesOptions {
  branchFlag: boolean;
  filesArg?: string;
  checkDependents: boolean;
  log: ToolingLog;
}

/**
 * Resolve target files from CLI flags (--files, --branch, --check-dependents)
 */
export async function resolveTargetFiles(
  options: ResolveTargetFilesOptions
): Promise<string[] | undefined> {
  const { branchFlag, filesArg, checkDependents, log } = options;

  let fileListArray: string[] | undefined;

  // Handle --branch flag
  if (branchFlag) {
    fileListArray = await resolveChangedFilesFromBranch(log);
  }

  // Handle --files flag (overrides --branch)
  if (filesArg) {
    fileListArray = filesArg
      .trim()
      .split(/[,\n]/)
      .map((f: string) => f.trim())
      .filter(Boolean);
  }

  // Handle --check-dependents flag
  if (checkDependents && fileListArray && fileListArray.length > 0) {
    log.info('Finding files that import the changed files...');

    const dependentFiles = await findDependentFiles(fileListArray, log);

    if (dependentFiles.length > 0) {
      log.info(`Found ${dependentFiles.length} dependent file(s) in total`);

      const allFiles = new Set([...fileListArray, ...dependentFiles]);

      fileListArray = Array.from(allFiles);
    } else {
      log.info('No dependent files found');
    }
  }

  return fileListArray;
}

/**
 * Find all unique packages that contain the given files
 */
export function findAffectedPackages(files: string[]): Package[] {
  const packagesMap = new Map<string, Package>();

  for (const file of files) {
    // Convert to absolute path if relative
    const absolutePath = isAbsolute(file) ? file : resolve(REPO_ROOT, file);

    // Find the package that contains this file
    const pkg = findPackageForPath(REPO_ROOT, absolutePath);
    if (pkg && !packagesMap.has(pkg.id)) {
      packagesMap.set(pkg.id, pkg);
    }
  }

  return Array.from(packagesMap.values());
}

/**
 * Process target files to extract packages and format for CLI arguments
 */
export function processTargetFiles(
  files: string[] | undefined,
  log: ToolingLog
): TargetResolutionResult {
  if (!files || files.length === 0) {
    return {};
  }

  const affectedPackages = findAffectedPackages(files);
  const targetFiles = files.join(',');
  const targetPackages = affectedPackages.map((pkg) => pkg.normalizedRepoRelativeDir).join(',');

  log.info(`Target files specified: ${files.length} file(s)`);
  log.info(
    `Affected packages: ${
      affectedPackages.length > 0 ? affectedPackages.map((p) => p.id).join(', ') : '(none found)'
    }`
  );

  return { targetFiles, targetPackages };
}
