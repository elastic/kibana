/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Locator } from '@playwright/test';
import type { ScoutPage } from '..';
import { expect } from '..';

/**
 * Shared page object for interacting with embeddable panel actions (hover actions and the
 * panel context menu). Used by any app that renders embeddable panels, such as Dashboard and Canvas.
 */
export class PanelActions {
  constructor(private readonly page: ScoutPage) {}

  /**
   * Formats a panel title for use in test subject selectors.
   */
  private formatTitleForTestSubj(title: string): string {
    return title.replace(/\s/g, '');
  }

  /**
   * Gets the hover actions wrapper for a panel by title.
   *
   * @param title - Panel title. If empty, finds first panel by class.
   */
  getPanelHoverActionsLocator(title?: string): Locator {
    if (!title) {
      // Fallback: find first panel by class when no title provided
      // eslint-disable-next-line playwright/no-nth-methods
      return this.page.locator('.embPanel__hoverActionsAnchor').first();
    }
    return this.page.testSubj.locator(
      `embeddablePanelHoverActions-${this.formatTitleForTestSubj(title)}`
    );
  }

  /**
   * Scrolls the panel into view, hovers it, and waits for the hover menu to render.
   */
  async hoverPanel(title?: string): Promise<Locator> {
    const panelWrapper = this.getPanelHoverActionsLocator(title);
    await panelWrapper.scrollIntoViewIfNeeded();
    await panelWrapper.hover();
    // Wait for the hover menu to render before checking for actions
    await panelWrapper.locator('.embPanel__hoverActions').waitFor({ state: 'visible' });
    return panelWrapper;
  }

  /**
   * Opens the context menu for a panel.
   * Scrolls the panel into view and clicks the menu toggle.
   */
  async openPanelContextMenu(title?: string) {
    const panelWrapper = await this.hoverPanel(title);

    const contextMenuOpen = panelWrapper.locator(
      '[data-test-subj="embeddablePanelContextMenuOpen"]'
    );
    if (await contextMenuOpen.isVisible()) {
      return;
    }

    const menuIcon = panelWrapper.locator('[data-test-subj="embeddablePanelToggleMenuIcon"]');
    await menuIcon.click();
    await expect(contextMenuOpen).toBeVisible();
  }

  /**
   * Clicks a quick action in the panel's hover actions row.
   *
   * The action is scoped to the panel wrapper so another panel's actions are never clicked.
   * Playwright's click waits for the action to render, so this is safe right after a view mode
   * change, when quick actions are still being resolved. Fails if the action is not a quick action
   * for the current view mode; use `clickContextMenuAction` for context menu actions.
   */
  async clickHoverAction(actionTestSubj: string, title?: string) {
    const panelWrapper = await this.hoverPanel(title);
    await panelWrapper.locator(`[data-test-subj="${actionTestSubj}"]`).click();
  }

  /**
   * Opens the panel's context menu and clicks an action in it.
   *
   * Fails if the action is not a context menu action for the current view mode; use
   * `clickHoverAction` for quick actions.
   */
  async clickContextMenuAction(actionTestSubj: string, title?: string) {
    await this.openPanelContextMenu(title);
    // The menu renders in a portal outside the panel, so it cannot be panel-scoped; filtering to
    // the visible match skips the hidden quick-action buttons that every other panel renders
    // under the same test subject.
    await this.page.testSubj.locator(actionTestSubj).filter({ visible: true }).click();
    // Wait for context menu to close after clicking the action
    await expect(this.page.testSubj.locator('embeddablePanelContextMenuOpen')).toBeHidden();
  }

  /**
   * Checks if a quick action is currently visible in the panel's hover actions row.
   *
   * This is a point-in-time check, not a wait: use it for the current state only, and prefer
   * `clickHoverAction` when the goal is to interact with the action. Unlike the context menu, there
   * is no reliable signal that the hover actions have finished loading: `data-actions-loading`
   * does not cover quick actions that change afterwards (e.g. Edit), so a `false` result can be
   * a false negative.
   */
  async panelHasHoverAction(actionTestSubj: string, title?: string): Promise<boolean> {
    const panelWrapper = await this.hoverPanel(title);
    return panelWrapper.locator(`[data-test-subj="${actionTestSubj}"]`).isVisible();
  }

  /**
   * Asserts that a quick action is visible in the panel's hover actions row (throws if not found).
   * Waits for the action to render, so this is safe right after a view mode change, when quick
   * actions are still being resolved.
   *
   * @param actionTestSubj - `data-test-subj` of the quick action that must be in the hover row.
   * @param title - Panel title. If omitted, uses the first panel.
   */
  async expectHasHoverAction(actionTestSubj: string, title?: string) {
    const panelWrapper = await this.hoverPanel(title);
    await expect(panelWrapper.locator(`[data-test-subj="${actionTestSubj}"]`)).toBeVisible();
  }

  /**
   * Opens the panel's context menu and waits until all of the given actions are visible in it.
   *
   * On success the menu is left open so the caller can check it further, and the caller must
   * close it. If the actions don't all appear, closes the menu and throws an error listing the
   * actions that are available.
   *
   * @param actionTestSubjs - `data-test-subj` values of the actions to wait for.
   * @param title - Panel title. If omitted, uses the first panel.
   */
  private async waitUntilContextMenuContains(actionTestSubjs: string[], title?: string) {
    await this.openPanelContextMenu(title);
    try {
      for (const actionTestSubj of actionTestSubjs) {
        // The menu renders in a portal outside the panel, so it cannot be panel-scoped; filtering
        // to the visible match skips the hidden quick-action buttons that other panels render.
        await expect(
          this.page.testSubj.locator(actionTestSubj).filter({ visible: true })
        ).toBeVisible();
      }
    } catch {
      const availableActions = await this.page
        .locator('[data-test-subj^="embeddablePanelAction-"]')
        .filter({ visible: true })
        .all();
      const availableTestSubjs: string[] = [];
      for (const available of availableActions) {
        const testSubj = await available.getAttribute('data-test-subj');
        if (testSubj) availableTestSubjs.push(testSubj);
      }
      await this.page.keyboard.press('Escape');

      throw new Error(
        `Expected context menu to contain [${actionTestSubjs.join(', ')}] for panel "${
          title || 'first panel'
        }". Available actions: [${availableTestSubjs.join(', ')}]`
      );
    }
  }

  /**
   * Asserts that an action is listed in the panel's context menu (throws if not found).
   * Waits for the action to render, and lists the available actions in the error message.
   */
  async expectHasContextMenuAction(actionTestSubj: string, title?: string) {
    await this.waitUntilContextMenuContains([actionTestSubj], title);
    await this.page.keyboard.press('Escape');
  }

  /**
   * Asserts that an action is NOT listed in the panel's context menu.
   *
   * @param actionTestSubj - `data-test-subj` of the action that must not be in the context menu.
   * @param title - Panel title. If omitted, uses the first panel.
   */
  async expectHasNoContextMenuAction(actionTestSubj: string, title?: string) {
    await this.openPanelContextMenu(title);
    try {
      // The context menu is populated asynchronously. The hover actions set
      // `data-actions-loading="false"` once every action's compatibility check has resolved, so a
      // missing action is a real absence and not a menu that is still loading. This only holds for
      // the context menu: do not use it to assert on hover actions, which can still change after
      // it is set.
      await expect(
        this.getPanelHoverActionsLocator(title).locator(
          '.embPanel__hoverActions[data-actions-loading="false"]'
        )
      ).toBeVisible();
      await expect(
        this.page.testSubj.locator(actionTestSubj).filter({ visible: true })
      ).toBeHidden();
    } finally {
      await this.page.keyboard.press('Escape');
    }
  }
}
