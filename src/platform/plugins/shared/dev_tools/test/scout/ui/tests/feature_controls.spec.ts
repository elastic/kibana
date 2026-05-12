/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage } from '@kbn/scout';
import { test, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { DEV_TOOLS_ALL_ROLE, DEV_TOOLS_READ_ROLE, NO_DEV_TOOLS_ROLE, DEV_TOOL_APPS } from '../fixtures/constants';

const CUSTOM_SPACE = {
  id: 'custom_space',
  name: 'custom_space',
  disabledFeatures: [],
};

const CUSTOM_SPACE_DEV_TOOLS_DISABLED = {
  id: 'custom_space_dev_tools_disabled',
  name: 'custom_space_dev_tools_disabled',
  disabledFeatures: ['dev_tools'],
};

const expectDevToolsNavLink = async (page: ScoutPage, visible: boolean) => {
  const devToolsLink = page.getByRole('link', { name: 'Dev Tools' });
  if (visible) {
    await expect(devToolsLink).toBeVisible();
  } else {
    await expect(devToolsLink).toBeHidden();
  }
};

const expectReadOnlyBadge = async (page: ScoutPage, visible: boolean) => {
  const readOnlyBadge = page.getByText('Read only', { exact: true });
  if (visible) {
    await expect(readOnlyBadge).toBeVisible();
  } else {
    await expect(readOnlyBadge).toBeHidden();
  }
};

test.describe('Dev Tools feature controls', { tag: tags.stateful.classic }, () => {
  test.afterAll(async ({ apiServices }) => {
    await apiServices.spaces.delete(CUSTOM_SPACE.id).catch(() => {});
    await apiServices.spaces.delete(CUSTOM_SPACE_DEV_TOOLS_DISABLED.id).catch(() => {});
  });

  test('dev tools all privileges allow navigation without read-only badge', async ({
    browserAuth,
    page,
  }) => {
    await browserAuth.loginWithCustomRole(DEV_TOOLS_ALL_ROLE);
    await page.gotoApp('home');
    await expectDevToolsNavLink(page, true);

    for (const { hash, readySubject } of DEV_TOOL_APPS) {
      await page.gotoApp('dev_tools', { hash });
      await expect(page.testSubj.locator(readySubject)).toBeVisible();
      await expectReadOnlyBadge(page, false);
    }
  });

  test('dev tools read privileges allow navigation with read-only badge', async ({
    browserAuth,
    page,
  }) => {
    await browserAuth.loginWithCustomRole(DEV_TOOLS_READ_ROLE);
    await page.gotoApp('home');
    await expectDevToolsNavLink(page, true);

    for (const { hash, readySubject } of DEV_TOOL_APPS) {
      await page.gotoApp('dev_tools', { hash });
      await expect(page.testSubj.locator(readySubject)).toBeVisible();
      await expectReadOnlyBadge(page, true);
    }
  });

  test('users without dev tools privileges cannot access dev tools apps', async ({
    browserAuth,
    page,
  }) => {
    await browserAuth.loginWithCustomRole(NO_DEV_TOOLS_ROLE);
    await page.gotoApp('home');
    await expectDevToolsNavLink(page, false);

    for (const { hash } of DEV_TOOL_APPS) {
      await page.gotoApp('dev_tools', { hash });
      await expect(page.getByText('Application Not Found')).toBeVisible();
    }
  });

  test('space with dev tools enabled exposes registered dev tool apps', async ({
    apiServices,
    browserAuth,
    kbnUrl,
    page,
  }) => {
    await apiServices.spaces.create(CUSTOM_SPACE);
    await browserAuth.loginWithCustomRole(DEV_TOOLS_READ_ROLE);
    await page.goto(kbnUrl.app('home', { space: CUSTOM_SPACE.id }));
    await expectDevToolsNavLink(page, true);

    for (const { hash, readySubject } of DEV_TOOL_APPS) {
      await page.goto(
        kbnUrl.app('dev_tools', {
          space: CUSTOM_SPACE.id,
          pathOptions: { hash },
        })
      );
      await expect(page.testSubj.locator(readySubject)).toBeVisible();
    }
  });

  test('space with dev tools disabled hides registered dev tool apps', async ({
    apiServices,
    browserAuth,
    kbnUrl,
    page,
  }) => {
    await apiServices.spaces.create(CUSTOM_SPACE_DEV_TOOLS_DISABLED);
    await browserAuth.loginWithCustomRole(DEV_TOOLS_ALL_ROLE);
    await page.goto(kbnUrl.app('home', { space: CUSTOM_SPACE_DEV_TOOLS_DISABLED.id }));
    await expectDevToolsNavLink(page, false);

    for (const { hash } of DEV_TOOL_APPS) {
      await page.goto(
        kbnUrl.app('dev_tools', {
          space: CUSTOM_SPACE_DEV_TOOLS_DISABLED.id,
          pathOptions: { hash },
        })
      );
      await expect(page.getByText('Application Not Found')).toBeVisible();
    }
  });
});
