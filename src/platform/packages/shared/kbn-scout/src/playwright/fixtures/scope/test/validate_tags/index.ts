/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { test as base } from '@playwright/test';
import { testTags } from '@kbn/scout-info';

export const validateTagsFixture = base.extend<{ validateTags: void }>({
  validateTags: [
    async ({}, use, testInfo) => {
      const issues = testTags.findIssues(testInfo.tags);
      if (issues.length > 0) {
        throw new Error(
          `Invalid tag(s) found in test suite "${testInfo.title}":\n${issues
            .map(({ message }) => `- ${message}`)
            .join('\n')}`
        );
      }

      await use();
    },
    { auto: true },
  ],
});
