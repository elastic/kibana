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

test.describe('Dev Tools feature controls', { tag: tags.stateful.classic }, () => {
  test.afterAll(async ({ apiServices }) => {
    await apiServices.spaces.delete(testData.CUSTOM_SPACE.id).catch(() => {});
    await apiServices.spaces.delete(testData.CUSTOM_SPACE_DEV_TOOLS_DISABLED.id).catch(() => {});
  });

  test('dev tools all privileges allow navigation', async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsDevToolsAll();

    for (const { hash, readySubject } of testData.DEV_TOOL_APPS) {
      await pageObjects.devTools.goto(hash);
      await expect(pageObjects.devTools.appContainer(readySubject)).toBeVisible();
    }
    await expect(pageObjects.devTools.readOnlyBadge).toBeHidden();
  });

  test('dev tools read privileges allow navigation', async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsDevToolsRead();

    for (const { hash, readySubject } of testData.DEV_TOOL_APPS) {
      await pageObjects.devTools.goto(hash);
      await expect(pageObjects.devTools.appContainer(readySubject)).toBeVisible();
    }
    await expect(pageObjects.devTools.readOnlyBadge).toBeVisible();
    await expect(pageObjects.devTools.readOnlyBadge).toHaveAttribute(
      'data-test-badge-label',
      'Read only'
    );
  });

  test('users without dev tools privileges cannot access dev tools UI', async ({
    browserAuth,
    kbnUrl,
    page,
    pageObjects: { collapsibleNav },
  }) => {
    await browserAuth.loginAsNoDevToolsPrivileges();
    await page.gotoApp('discover');

    const navLinks = await collapsibleNav.getNavLinks();
    expect(navLinks).toContain('Discover');
    expect(navLinks).not.toContain('Dev Tools');

    for (const { hash } of testData.DEV_TOOL_APPS) {
      await page.goto(kbnUrl.app('dev_tools', { pathOptions: { hash } }));
      // The security plugin intercepts at the server level and redirects to
      // /security/reset_session when the session lacks the dev_tools feature.
      await page.waitForURL(/\/security\/reset_session/);
      await expect(page.testSubj.locator('promptPage')).toBeVisible();
    }
  });

  test('space with dev tools enabled exposes registered dev tool apps', async ({
    apiServices,
    browserAuth,
    kbnUrl,
    page,
    pageObjects,
  }) => {
    await apiServices.spaces.delete(testData.CUSTOM_SPACE.id).catch(() => {});
    await apiServices.spaces.create(testData.CUSTOM_SPACE);
    await browserAuth.loginAsDevToolsRead();

    for (const { hash, readySubject } of testData.DEV_TOOL_APPS) {
      await page.goto(
        kbnUrl.app('dev_tools', {
          space: testData.CUSTOM_SPACE.id,
          pathOptions: { hash },
        })
      );
      await expect(pageObjects.devTools.appContainer(readySubject)).toBeVisible();
    }
  });

  test('space with dev tools disabled hides and blocks registered dev tool apps', async ({
    apiServices,
    browserAuth,
    kbnUrl,
    page,
    pageObjects,
  }) => {
    await apiServices.spaces.delete(testData.CUSTOM_SPACE_DEV_TOOLS_DISABLED.id).catch(() => {});
    await apiServices.spaces.create(testData.CUSTOM_SPACE_DEV_TOOLS_DISABLED);
    await browserAuth.loginAsDevToolsAll();

    await page.goto(kbnUrl.app('home', { space: testData.CUSTOM_SPACE_DEV_TOOLS_DISABLED.id }));
    const navLinks = await pageObjects.collapsibleNav.getNavLinks();
    expect(navLinks).not.toContain('Dev Tools');

    for (const { hash, readySubject } of testData.DEV_TOOL_APPS) {
      await page.goto(
        kbnUrl.app('dev_tools', {
          space: testData.CUSTOM_SPACE_DEV_TOOLS_DISABLED.id,
          pathOptions: { hash },
        })
      );
      // The spaces middleware blocks the request at the server level and returns
      // a raw JSON 404 — the SPA never loads, so the app containers are absent.
      await expect(pageObjects.devTools.appContainer(readySubject)).toBeHidden();
    }
  });
});
