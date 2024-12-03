/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { test as base } from '@playwright/test';
import { tags } from '../..';

const supportedTags = tags.DEPLOYMENT_AGNOSTIC;

export const validateTagsFixture = base.extend<{ validateTags: void }>({
  validateTags: [
    async ({}, use, testInfo) => {
      if (testInfo.tags.length === 0) {
        throw new Error(`At least one tag is required: ${supportedTags.join(', ')}`);
      }

      const invalidTags = testInfo.tags.filter((tag: string) => !supportedTags.includes(tag));
      if (invalidTags.length > 0) {
        throw new Error(
          `Unsupported tag(s) found in test suite "${testInfo.title}": ${invalidTags.join(
            ', '
          )}. ` + `Supported tags are: ${supportedTags.join(', ')}.`
        );
      }

      await use();
    },
    { auto: true },
  ],
});
