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
import { test } from '../fixtures';

// Longer than the 100ms blur-hide delay in the output actions provider, so the
// release happens after the point where the pre-fix code hid the button mid-click.
const HUMAN_CLICK_HOLD_MS = 250;

test.describe('Console output copy to clipboard', { tag: tags.deploymentAgnostic }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.console.gotoWithRequestLoaded('GET /');
  });

  test('copies the selected output on a human-speed (held) click', async ({ pageObjects }) => {
    await test.step('run a request and select its output', async () => {
      await pageObjects.console.sendRequest();
      await pageObjects.console.selectOutput();
    });

    await test.step('press the copy button, holding it longer than the blur-hide delay', async () => {
      await pageObjects.console.slowClickCopyOutput(HUMAN_CLICK_HOLD_MS);
    });

    await test.step('the copy completes with a success toast', async () => {
      await pageObjects.toasts.waitFor();
      expect(await pageObjects.toasts.getHeaderText()).toContain(
        'Selected output copied to clipboard'
      );
    });
    // Post-copy feedback (actions hiding again) is asserted in the component tests;
    // here the clipboard mechanism differs per browser permissions (the document-copy
    // fallback re-triggers Monaco selection events that re-show the actions).
  });
});
