/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { test } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

// ECH renders a different set of solution cards and the new side navigation, so these only apply locally.
const LOCAL_ONLY_TAGS = ['@local-stateful-classic'];
const SOLUTION_IDS = ['kibana', 'enterpriseSearch', 'observability', 'securitySolution'];
const CHROME_SEARCH_BUTTON = 'kbnChromeHeader-searchButton';
// The side navigation and the search modal render outside .kbnAppWrapper.
const A11Y_NAV_SELECTORS = ['[data-test-subj="collapsibleNav"]', '[data-euiportal="true"]'];

test.describe('Kibana chrome and solution cards', { tag: LOCAL_ONLY_TAGS }, () => {
  test('solution cards open their overview page without a11y violations', async ({
    browserAuth,
    page,
    pageObjects,
  }) => {
    await browserAuth.loginAsViewer();
    await pageObjects.home.goto();

    const solutions = await pageObjects.home.getVisibleSolutions();
    expect(solutions).toStrictEqual(expect.arrayContaining(SOLUTION_IDS));

    for (const solution of SOLUTION_IDS) {
      await test.step(`${solution} overview`, async () => {
        await pageObjects.home.goto();
        await page.getByTestId(`homeSolutionPanel homeSolutionPanel_${solution}`).click();
        await expect(page).not.toHaveURL(/\/app\/home/);
        // The app's own wrapper (nested in the chrome one) stays aria-busy until the app's mount() resolved.
        await expect(page.locator('.kbnAppWrapper[aria-busy]')).toHaveAttribute(
          'aria-busy',
          'false'
        );

        const { violations } = await page.checkA11y({ include: ['.kbnAppWrapper'] });
        expect(violations).toStrictEqual([]);
      });
    }
  });

  test('side navigation and global search have no a11y violations', async ({
    browserAuth,
    page,
    pageObjects,
  }) => {
    await browserAuth.loginAsViewer();
    await pageObjects.home.goto();

    await test.step('side navigation', async () => {
      await pageObjects.collapsibleNav.expandNav();
      await expect(page.getByTestId('collapsibleNav')).toBeVisible();

      const { violations } = await page.checkA11y({ include: A11Y_NAV_SELECTORS });
      expect(violations).toStrictEqual([]);
    });

    await test.step('global search', async () => {
      await page.keyboard.press('Escape');
      await page.getByTestId(CHROME_SEARCH_BUTTON).click();
      await expect(page.getByTestId('globalSearchModal')).toBeVisible();

      const { violations } = await page.checkA11y({ include: A11Y_NAV_SELECTORS });
      expect(violations).toStrictEqual([]);
    });
  });
});
