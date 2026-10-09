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
import { test, testData } from '../fixtures';

test.describe('Dev Tools breadcrumbs', { tag: tags.stateful.classic }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsDevToolsRead();
  });

  for (const { hash, label } of testData.DEV_TOOL_APPS) {
    test(`sets the last breadcrumb for ${label}`, async ({ pageObjects }) => {
      await pageObjects.devTools.goto(hash);

      await expect(pageObjects.devTools.lastBreadcrumb).toHaveText(label);
    });
  }
});
