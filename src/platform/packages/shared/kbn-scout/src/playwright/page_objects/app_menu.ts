/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { APP_MENU_TEST_SUBJECTS } from '@kbn/app-header';
import type { Locator } from 'playwright/test';
import type { ScoutPage } from '..';

const POPOVER_OPEN_TIMEOUT = 2_000;

/**
 * Shared page object for the AppHeader action menu.
 *
 * Menu items sit inline on wide viewports and collapse into the overflow
 * popover on narrow ones. Use {@link AppMenu.clickItem} / {@link AppMenu.revealItem}
 * instead of copying that branching into each app page object.
 */
export class AppMenu {
  public readonly overflowButton: Locator;
  public readonly popover: Locator;

  constructor(private readonly page: ScoutPage) {
    this.overflowButton = this.page.testSubj.locator(APP_MENU_TEST_SUBJECTS.overflowButton);
    this.popover = this.page.testSubj.locator(APP_MENU_TEST_SUBJECTS.popover);
  }

  private toLocator(item: Locator | string): Locator {
    return typeof item === 'string' ? this.page.testSubj.locator(item) : item;
  }

  /**
   * Opens the overflow popover. Closes a stale popover first so the next click
   * opens it instead of toggling it shut.
   */
  async openOverflow(): Promise<void> {
    await this.overflowButton.waitFor({ state: 'visible' });

    if (await this.popover.isVisible()) {
      await this.overflowButton.click();
      await this.popover.waitFor({ state: 'hidden' });
    }

    await this.overflowButton.click();
    const popoverOpened = await this.popover
      .waitFor({ state: 'visible', timeout: POPOVER_OPEN_TIMEOUT })
      .then(() => true)
      .catch(() => false);
    if (!popoverOpened) {
      await this.overflowButton.click();
      await this.popover.waitFor({ state: 'visible' });
    }
  }

  /**
   * Makes a menu item visible, opening overflow when the item is collapsed.
   * No-ops when the item is already inline.
   */
  async revealItem(item: Locator | string): Promise<void> {
    const locator = this.toLocator(item);
    if (await locator.isVisible()) {
      return;
    }

    // Poll separately: `.or().waitFor()` throws in strict mode when both
    // locators are visible, and `.first()` is banned.
    await Promise.race([
      locator.waitFor({ state: 'visible' }),
      this.overflowButton.waitFor({ state: 'visible' }),
    ]);
    if (await locator.isVisible()) {
      return;
    }

    await this.openOverflow();
    await locator.waitFor({ state: 'visible' });
  }

  /**
   * Clicks a menu item, opening overflow first when the item is not inline.
   * Accepts a locator or a `data-test-subj` string.
   */
  async clickItem(item: Locator | string): Promise<void> {
    const locator = this.toLocator(item);
    await this.revealItem(locator);
    await locator.click();
  }

  /**
   * Opens overflow and clicks a menu item that the caller knows is collapsed.
   * Use this instead of {@link AppMenu.clickItem} when the test does not need
   * the inline-vs-overflow branch.
   */
  async clickOverflowItem(item: Locator | string): Promise<void> {
    const locator = this.toLocator(item);
    await this.openOverflow();
    await locator.waitFor({ state: 'visible' });
    await locator.click();
  }
}
