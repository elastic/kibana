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

test.describe('Console config', { tag: tags.deploymentAgnostic }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.console.goto();
    await pageObjects.console.skipTourIfExists();
    await pageObjects.console.clearEditorText();
  });

  test('shows the accessibility overlay on Escape and hides it once disabled', async ({
    page,
    pageObjects,
  }) => {
    await test.step('Escape opens the overlay while the setting is on', async () => {
      await pageObjects.console.pressEscapeInEditor();
      await expect(pageObjects.console.a11yOverlay).toBeVisible();
      // Enter returns the focus to the editor.
      await pageObjects.console.pressEnterInEditor();
    });

    await test.step('turning the setting off in the Config tab', async () => {
      await pageObjects.console.openConfigTab();
      await pageObjects.console.setA11yOverlayEnabled(false);
      const { violations } = await page.checkA11y({
        include: ['[data-test-subj="consoleConfigPanel"]'],
      });
      expect(violations).toStrictEqual([]);
      await pageObjects.console.openShellTab();
    });

    await test.step('Escape no longer opens the overlay', async () => {
      await pageObjects.console.pressEscapeInEditor();
      await expect(pageObjects.console.a11yOverlay).toBeHidden();
    });
  });

  test('applies the configured font size to the editor', async ({ pageObjects }) => {
    for (const fontSize of [20, 24]) {
      await test.step(`${fontSize}px`, async () => {
        await pageObjects.console.openConfigTab();
        await pageObjects.console.setFontSize(fontSize);
        await pageObjects.console.openShellTab();

        // The setting is not applied synchronously.
        await expect.poll(() => pageObjects.console.getEditorFontSize()).toBe(`${fontSize}px`);
      });
    }
  });

  test('opens and closes the help popover', async ({ pageObjects }) => {
    await expect(pageObjects.console.helpPopoverContent).toBeHidden();

    await pageObjects.console.toggleHelpPopover();
    await expect(pageObjects.console.helpPopoverContent).toBeVisible();

    await pageObjects.console.toggleHelpPopover();
    await expect(pageObjects.console.helpPopoverContent).toBeHidden();
  });
});
