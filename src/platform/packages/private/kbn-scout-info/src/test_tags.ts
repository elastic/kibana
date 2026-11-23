/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ScoutTestLimit, testLimits } from './test_limit';
import { testTargets } from './test_target';

export const SCOUT_PERFORMANCE_PLAYWRIGHT_TAG = '@perf';

export type ScoutTestTagIssueKind =
  | 'unsupported-tag'
  | 'invalid-limit-tag'
  | 'missing-selection-tag'
  | 'conflicting-limit-tags';

export interface ScoutTestTagIssue {
  kind: ScoutTestTagIssueKind;
  message: string;
}

export const testTags = {
  /**
   * Tags that select the test targets a test runs on. Every test needs at least one.
   */
  get selection(): string[] {
    return [
      ...testTargets.all.map((target) => target.playwrightTag),
      SCOUT_PERFORMANCE_PLAYWRIGHT_TAG,
    ];
  },

  get limit(): string[] {
    return testLimits.all.map((limit) => limit.playwrightTag);
  },

  get supported(): string[] {
    return [...this.selection, ...this.limit];
  },

  /**
   * Every rule a Scout test's Playwright tags must satisfy, reported together.
   */
  findIssues(playwrightTags: readonly string[]): ScoutTestTagIssue[] {
    const issues: ScoutTestTagIssue[] = [];
    const selectionTags = this.selection;
    const limitTags = this.limit;
    const supportedTags = [...selectionTags, ...limitTags];

    const unsupportedTags = playwrightTags.filter((tag) => !supportedTags.includes(tag));
    const invalidLimitTags = unsupportedTags.filter(testLimits.isPlaywrightTag);
    const otherUnsupportedTags = unsupportedTags.filter((tag) => !testLimits.isPlaywrightTag(tag));

    if (invalidLimitTags.length > 0) {
      issues.push({
        kind: 'invalid-limit-tag',
        message:
          `Invalid limit tag(s): ${invalidLimitTags.join(', ')}. ` +
          `Valid limit tags are: ${limitTags.join(', ')}.`,
      });
    }

    if (otherUnsupportedTags.length > 0) {
      issues.push({
        kind: 'unsupported-tag',
        message:
          `Unsupported tag(s): ${otherUnsupportedTags.join(', ')}. ` +
          `Supported tags are: ${supportedTags.join(', ')}.`,
      });
    }

    if (!playwrightTags.some((tag) => selectionTags.includes(tag))) {
      issues.push({
        kind: 'missing-selection-tag',
        message:
          `At least one of the following tags is required: ${selectionTags.join(', ')}. ` +
          'Limit tags only narrow an existing selection.',
      });
    }

    const selectionMethodsByAttribute = new Map<string, Set<string>>();
    for (const limit of testLimits.fromPlaywrightTags(
      playwrightTags.filter((tag) => limitTags.includes(tag))
    )) {
      const methods = selectionMethodsByAttribute.get(limit.targetAttribute) ?? new Set<string>();
      methods.add(limit.selectionMethod);
      selectionMethodsByAttribute.set(limit.targetAttribute, methods);
    }

    for (const [targetAttribute, methods] of selectionMethodsByAttribute) {
      if (methods.size > 1) {
        issues.push({
          kind: 'conflicting-limit-tags',
          message:
            `Conflicting limit tags for the '${targetAttribute}' target attribute: ` +
            `${[...methods]
              .map((method) => new ScoutTestLimit(method, targetAttribute).playwrightTag)
              .join(', ')}. A test carrying both would never run.`,
        });
      }
    }

    return issues;
  },
};
