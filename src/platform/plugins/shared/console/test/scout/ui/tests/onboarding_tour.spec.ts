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

// In step order.
const STEP_TITLES = [
  'Welcome to the Console',
  'Get started querying',
  'Revisit past queries',
  'Customize your toolbox',
  'Manage Console files',
];

test.describe('Console onboarding tour', { tag: tags.deploymentAgnostic }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.console.goto();
    await pageObjects.console.skipTourIfExists();
  });

  test('starts only once the run tour button is pressed', async ({ pageObjects }) => {
    await expect(pageObjects.console.tourStepTitle(STEP_TITLES[0])).toBeHidden();

    await pageObjects.console.runTour();

    await expect(pageObjects.console.tourStepTitle(STEP_TITLES[0])).toBeVisible();
  });

  test('walks through the five steps and completes', async ({ pageObjects }) => {
    await pageObjects.console.runTour();

    for (const title of STEP_TITLES.slice(0, -1)) {
      await test.step(title, async () => {
        await expect(pageObjects.console.tourStepTitle(title)).toBeVisible();
        await pageObjects.console.nextTourStepButton.click();
      });
    }

    // The last step offers "Complete" instead of "Next".
    const lastStepTitle = STEP_TITLES[STEP_TITLES.length - 1];
    await expect(pageObjects.console.tourStepTitle(lastStepTitle)).toBeVisible();
    await expect(pageObjects.console.completeTourButton).toBeVisible();
    await pageObjects.console.completeTourButton.click();

    for (const title of STEP_TITLES) {
      await expect(pageObjects.console.tourStepTitle(title)).toBeHidden();
    }
  });

  test('hides every step when the tour is skipped', async ({ pageObjects }) => {
    await pageObjects.console.runTour();
    await expect(pageObjects.console.tourStepTitle(STEP_TITLES[0])).toBeVisible();

    await pageObjects.console.skipTourButton.click();

    await expect(pageObjects.console.skipTourButton).toBeHidden();
    for (const title of STEP_TITLES) {
      await expect(pageObjects.console.tourStepTitle(title)).toBeHidden();
    }
  });

  test('can be re-run after being skipped', async ({ pageObjects }) => {
    await pageObjects.console.runTour();
    await expect(pageObjects.console.tourStepTitle(STEP_TITLES[0])).toBeVisible();

    await pageObjects.console.skipTourButton.click();
    await expect(pageObjects.console.tourStepTitle(STEP_TITLES[0])).toBeHidden();

    await pageObjects.console.runTour();

    await expect(pageObjects.console.tourStepTitle(STEP_TITLES[0])).toBeVisible();
  });
});
