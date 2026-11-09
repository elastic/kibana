/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

/** Smoke test for the `core.overlays.openFlyoutTemplate` path; EUI owns the focus trap itself. */
test.describe(
  'Flyout System - dialog focus accessibility',
  { tag: ['@local-stateful-classic'] },
  () => {
    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsViewer();
      await pageObjects.flyoutSystem.goto();
    });

    test('opening a service flyout moves focus into the dialog', async ({ pageObjects }) => {
      const app = pageObjects.flyoutSystem;
      const session = app.session('service');

      const flyout = await app.openFlyout('service', session);
      await expect
        .poll(async () => app.isFocusWithin(flyout), {
          message: 'focus should land inside the flyout once it opens',
        })
        .toBe(true);
    });
  }
);
