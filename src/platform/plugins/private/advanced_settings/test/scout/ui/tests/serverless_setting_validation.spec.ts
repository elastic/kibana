/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { DEFAULT_COLUMNS_ID } from '@kbn/management-settings-ids';
import { test } from '../fixtures';

test.describe(
  'Advanced settings - serverless setting validation',
  {
    tag: [
      ...tags.serverless.search,
      ...tags.serverless.observability.complete,
      ...tags.serverless.security.complete,
    ],
  },
  () => {
    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.settings.goto();
    });

    test('blocks saving an invalid value', async ({ pageObjects }) => {
      // Default columns allows at most 50 entries on serverless.
      const invalidValue = new Array(51).fill('test').toString();
      await pageObjects.settings.getField(DEFAULT_COLUMNS_ID).fill(invalidValue);
      await expect(pageObjects.settings.saveButton).toBeDisabled();
    });
  }
);
