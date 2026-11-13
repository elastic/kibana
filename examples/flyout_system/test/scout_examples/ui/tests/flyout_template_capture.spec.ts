/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';
import type { FlyoutForm } from '../fixtures';

const CAPTURE_DIR =
  process.env.FLYOUT_CAPTURE_DIR ??
  '/private/tmp/claude-501/-Users-tsullivan-elastic-kibana/e718fae4-22cc-42f8-9cbb-89e7499f84a2/scratchpad/captures';
const CAPTURE_PHASE = process.env.FLYOUT_CAPTURE_PHASE ?? 'after';
const capture = (page: ScoutPage, name: string) =>
  page.screenshot({ path: `${CAPTURE_DIR}/${CAPTURE_PHASE}/${name}.png`, animations: 'disabled' });

const FORMS: Array<{ form: FlyoutForm; name: string }> = [
  { form: 'component', name: 'component' },
  { form: 'service', name: 'overlays-service' },
];

test.describe('Flyout System - template capture', { tag: ['@local-stateful-classic'] }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsViewer();
    await pageObjects.flyoutSystem.goto();
  });

  for (const [index, { form, name }] of FORMS.entries()) {
    test(`captures the ${name} main flyout and child B`, async ({ page, pageObjects }) => {
      const app = pageObjects.flyoutSystem;
      const session = app.session(form);

      const main = await app.openFlyout(form, session);
      await expect(app.header(form, session)).toBeVisible();
      await expect(app.footerSaveAction(form, session)).toBeVisible();
      await capture(page, `examples-0${index * 2 + 1}-${name}-main`);

      const child = await app.openChildFlyout(form, session, 'B');
      await expect(child).toBeVisible();
      await expect(app.childFooterCloseAction(form, session)).toBeVisible();
      await expect(main).toBeVisible();
      await capture(page, `examples-0${index * 2 + 2}-${name}-child-b`);
    });
  }

  test('captures a system push flyout', async ({ page, pageObjects }) => {
    const app = pageObjects.flyoutSystem;
    await app.openPushFlyout('System push C');
    await expect(app.pushFlyout('System push C')).toBeVisible();
    await capture(page, 'examples-05-system-push');
  });
});
