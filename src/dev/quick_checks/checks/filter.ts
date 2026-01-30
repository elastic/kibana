/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { QuickCheck } from '../types';
import { getScriptShortName } from '../utils';

interface FilterOptions {
  checks: QuickCheck[];
  isCI: boolean;
  hasTargetPackages: boolean;
  log: ToolingLog;
}

interface FilterResult {
  checks: QuickCheck[];
  skippedLocal: string[];
  skippedNoPackages: string[];
}

/**
 * Filter checks based on local vs CI environment and package scoping
 */
export function filterChecksForRun(options: FilterOptions): FilterResult {
  const { isCI, hasTargetPackages, log } = options;
  let { checks } = options;
  const skippedLocal: string[] = [];
  const skippedNoPackages: string[] = [];

  // In CI, run all checks
  if (isCI) {
    return { checks, skippedLocal, skippedNoPackages };
  }

  // Filter out checks marked as skipLocal when running locally
  const localSkipped = checks.filter((check) => check.skipLocal);
  if (localSkipped.length > 0) {
    const skippedNames = localSkipped.map((c) => getScriptShortName(c.script));

    skippedLocal.push(...skippedNames);
    log.info(`Skipping ${localSkipped.length} check(s) for local run: ${skippedNames.join(', ')}`);
  }
  checks = checks.filter((check) => !check.skipLocal);

  // Skip checks that require package scoping when no packages are identified
  if (!hasTargetPackages) {
    const noPackageScopeSkipped = checks.filter((check) => check.skipLocalIfNoPackages);

    if (noPackageScopeSkipped.length > 0) {
      const skippedNames = noPackageScopeSkipped.map((c) => getScriptShortName(c.script));

      skippedNoPackages.push(...skippedNames);

      log.info(
        `Skipping ${noPackageScopeSkipped.length} check(s) (no package scope): ${skippedNames.join(
          ', '
        )}`
      );
    }

    checks = checks.filter((check) => !check.skipLocalIfNoPackages);
  }

  return { checks, skippedLocal, skippedNoPackages };
}
