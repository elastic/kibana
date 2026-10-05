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
import {
  addAnimationProbes,
  ANIMATION_EXEMPTIONS,
  startAnimationProbe,
} from '../fixtures/animation_probes';
import { getGlobalAdvancedSettingsAllRole } from '../fixtures/services/privileges';

const SETTING = 'accessibility:disableAnimations';

test.describe('Advanced settings - disable animations', { tag: tags.stateful.classic }, () => {
  test.beforeEach(async ({ browserAuth, kbnClient }) => {
    await kbnClient.uiSettings.update({ [SETTING]: false });
    await browserAuth.loginWithCustomRole(getGlobalAdvancedSettingsAllRole());
  });

  test.afterEach(async ({ kbnClient }) => {
    await kbnClient.uiSettings.unset(SETTING);
  });

  test('disables animations while preserving completion events and exemptions', async ({
    kbnUrl,
    page,
    pageObjects,
  }) => {
    await page.goto(kbnUrl.get('/app/management/kibana/settings'));
    await pageObjects.settings.waitForPageLoad();
    await addAnimationProbes(page);
    const probe = page.testSubj.locator('animation-probe-normal');

    await expect(probe).toHaveCSS('animation-duration', '1s');
    await expect(probe).toHaveCSS('transition-duration', '1s');
    await expect(probe).toHaveCSS('transition-delay', '1s');

    await pageObjects.settings.toggleAdvancedSettingCheckbox(SETTING);
    await page.reload();
    await pageObjects.settings.waitForPageLoad();
    await addAnimationProbes(page);

    await expect(probe).toHaveCSS('animation-duration', '0s');
    await expect(probe).toHaveCSS('transition-duration', '0s');
    await expect(probe).toHaveCSS('transition-delay', '0s');
    for (const exemption of ANIMATION_EXEMPTIONS) {
      const exemptProbe = page.testSubj.locator(`animation-probe-${exemption}`);
      await expect(exemptProbe).toHaveCSS('animation-duration', '1s');
      await expect(exemptProbe).toHaveCSS('transition-duration', '1s');
      await expect(exemptProbe).toHaveCSS('transition-delay', '1s');
    }

    await startAnimationProbe(page);
    await expect(probe).toHaveAttribute('data-animation-ended', 'true');

    await pageObjects.settings.toggleAdvancedSettingCheckbox(SETTING);
    await page.reload();
    await pageObjects.settings.waitForPageLoad();
    await addAnimationProbes(page);

    await expect(probe).toHaveCSS('animation-duration', '1s');
    await expect(probe).toHaveCSS('transition-duration', '1s');
    await expect(probe).toHaveCSS('transition-delay', '1s');
  });
});
