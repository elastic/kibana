/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { tags } from '../playwright/tags';

// Gets test tags for a given target type
export const getTestTagsForTarget = (target: string): string[] => {
  switch (target) {
    case 'mki':
      return tags.SERVERLESS_ONLY;
    case 'ech':
      return tags.ESS_ONLY;
    case 'all':
    default:
      return tags.DEPLOYMENT_AGNOSTIC;
  }
};

// Collects unique tags from spec files that have 'passed' expectedStatus (it means test is not skipped)
export const collectUniqueTags = (
  tests: Array<{ tags?: string[]; expectedStatus?: string; location?: { file?: string } }>
): string[] => {
  const tagSet = new Set<string>();
  for (const test of tests) {
    // Only collect tags from tests that have passed status and are spec files (e.g. skip global.setup.ts)
    if (
      test.expectedStatus === 'passed' &&
      test.location?.file?.endsWith('.spec.ts') &&
      test.tags
    ) {
      for (const tag of test.tags) {
        tagSet.add(tag);
      }
    }
  }
  return Array.from(tagSet);
};

// Converts tags to server run flags (e.g., --stateful, --serverless=es)
export const getServerRunFlagsFromTags = (testTags: string[]): string[] => {
  const flags: string[] = [];
  const tagSet = new Set(testTags);

  // Map tags to server run flags
  if (tagSet.has('@ess')) {
    flags.push('--stateful');
  }
  if (tagSet.has('@svlSearch')) {
    flags.push('--serverless=es');
  }
  if (tagSet.has('@svlSecurity')) {
    flags.push('--serverless=security');
  }
  if (tagSet.has('@svlOblt')) {
    flags.push('--serverless=oblt');
  }
  // TODO: Uncomment to run tests for these targets in CI
  //
  // if (tagSet.has('@svlLogsEssentials')) {
  //   flags.push('--serverless=oblt-logs-essentials');
  // }
  // if (tagSet.has('@svlSecurityEssentials')) {
  //   flags.push('--serverless=security-essentials');
  // }
  // if (tagSet.has('@svlSecurityEase')) {
  //   flags.push('--serverless=security-ease');
  // }

  return flags;
};
