/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutTargetArch, ScoutTargetDomain } from '@kbn/scout-info';
import { ScoutTestTarget, testTargets } from '@kbn/scout-info';
import { tags } from '../playwright/tags';

// Gets test tags for a given target type
export const getTestTagsForTarget = (target: string): string[] => {
  switch (target) {
    case 'local':
      return testTargets.local.map((t) => t.playwrightTag);
    case 'local-stateful-only':
      return testTargets.local.filter((t) => t.arch === 'stateful').map((t) => t.playwrightTag);
    case 'mki':
      return testTargets.cloud.filter((t) => t.arch === 'serverless').map((t) => t.playwrightTag);
    case 'ech':
      return testTargets.cloud.filter((t) => t.arch === 'stateful').map((t) => t.playwrightTag);
    case 'all':
    default:
      return tags.deploymentAgnostic;
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
      for (const testTag of test.tags) {
        tagSet.add(testTag);
      }
    }
  }
  return Array.from(tagSet);
};

// Converts tags to server run flags
export const getServerRunFlagsFromTags = (testTags: string[]): string[] => {
  const supportedArchDomainCombos: [ScoutTargetArch, ScoutTargetDomain][] = [
    ['stateful', 'classic'],
    ['serverless', 'search'],
    ['serverless', 'observability_complete'],
    // ['serverless', 'observability_logs_essentials'],
    ['serverless', 'security_complete'],
    // ['serverless', 'security_essentials'],
    // ['serverless', 'security_ease'],
    // ['serverless', 'workplaceai'],
  ];
  // TODO: Uncomment above to run tests for these targets in CI

  return [...new Set(testTags)]
    .map((tag) => ScoutTestTarget.fromPlaywrightTag(tag))
    .filter((target) =>
      supportedArchDomainCombos.some(
        ([arch, domain]) => target.arch === arch && target.domain === domain
      )
    )
    .map((target) => `--arch ${target.arch} --domain ${target.domain}`);
};
