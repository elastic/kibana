/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { test as base } from '@playwright/test';
import { ScoutTestLimit, testLimits, testTargets } from '@kbn/scout-info';
import { tags } from '../../../../tags';

const supportedSelectionTags = [
  ...testTargets.all.map((target) => target.playwrightTag),
  ...tags.performance,
];

const supportedLimitTags = testLimits.all.map((limit) => limit.playwrightTag);

const supportedTags = [...supportedSelectionTags, ...supportedLimitTags];

/**
 * Limit tags only narrow an existing selection, so they can never stand in for a
 * deployment tag: a test tagged with limits alone would never be discovered.
 */
export const findTagIssues = (testTags: string[]): string[] => {
  const issues: string[] = [];

  const invalidTags = testTags.filter((tag) => !supportedTags.includes(tag));
  if (invalidTags.length > 0) {
    issues.push(
      `Unsupported tag(s) found: ${invalidTags.join(', ')}. ` +
        `Supported tags are: ${supportedTags.join(', ')}.`
    );
  }

  if (!testTags.some((tag) => supportedSelectionTags.includes(tag))) {
    issues.push(
      `At least one of the following tags is required: ${supportedSelectionTags.join(', ')}. ` +
        `Limit tags (${supportedLimitTags.join(', ')}) only narrow an existing selection.`
    );
  }

  const selectionMethodsByAttribute = new Map<string, Set<string>>();
  testLimits
    .fromPlaywrightTags(testTags.filter((tag) => supportedLimitTags.includes(tag)))
    .forEach((limit) => {
      const selectionMethods =
        selectionMethodsByAttribute.get(limit.targetAttribute) ?? new Set<string>();
      selectionMethods.add(limit.selectionMethod);
      selectionMethodsByAttribute.set(limit.targetAttribute, selectionMethods);
    });

  selectionMethodsByAttribute.forEach((selectionMethods, targetAttribute) => {
    if (selectionMethods.size < 2) {
      return;
    }

    issues.push(
      `Conflicting limit tags for the '${targetAttribute}' target attribute: ` +
        `${[...selectionMethods]
          .map(
            (selectionMethod) => new ScoutTestLimit(selectionMethod, targetAttribute).playwrightTag
          )
          .join(', ')}. A test carrying both would never run.`
    );
  });

  return issues;
};

export const validateTagsFixture = base.extend<{ validateTags: void }>({
  validateTags: [
    async ({}, use, testInfo) => {
      if (testInfo.tags.length === 0) {
        throw new Error(`At least one tag is required: ${supportedTags.join(', ')}`);
      }

      const issues = findTagIssues(testInfo.tags);
      if (issues.length > 0) {
        throw new Error(
          `Invalid tag(s) found in test suite "${testInfo.title}":\n${issues
            .map((issue) => `- ${issue}`)
            .join('\n')}`
        );
      }

      await use();
    },
    { auto: true },
  ],
});
