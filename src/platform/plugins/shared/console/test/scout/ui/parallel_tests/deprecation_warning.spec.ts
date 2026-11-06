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
import { spaceTest } from '../fixtures';

// Stateful only: serverless blocks reaching a system index directly, so no deprecated
// request is available there.
spaceTest.describe('Console deprecation warnings', { tag: tags.stateful.classic }, () => {
  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.console.goto();
    await pageObjects.console.skipTourIfExists();
  });

  spaceTest('prints a deprecation warning for a deprecated request', async ({ pageObjects }) => {
    await pageObjects.console.clearEditorText();
    await pageObjects.console.enterText('GET .kibana');
    await pageObjects.console.sendRequest();

    expect(await pageObjects.console.responseHasDeprecationWarning()).toBe(true);
  });
});
