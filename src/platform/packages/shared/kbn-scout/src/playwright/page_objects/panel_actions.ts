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
   * Checks if a panel action exists as a descendant of the panel wrapper (not globally visible).
   */
  async panelActionExistsInWrapper(
    actionTestSubj: string,
    panelWrapper: Locator
  ): Promise<boolean> {
    return panelWrapper.locator(`[data-test-subj="${actionTestSubj}"]`).isVisible();
  }

  /**
   * Clicks a panel action from the hover actions or context menu.
   *
   * Checks if the action is a DESCENDANT of the panel wrapper, not just globally visible.
   * This prevents clicking the wrong panel's actions.
   */
  async clickPanelAction(actionTestSubj: string, title?: string) {
    const panelWrapper = await this.hoverPanel(title);

    if (await this.panelActionExistsInWrapper(actionTestSubj, panelWrapper)) {
      await panelWrapper.locator(`[data-test-subj="${actionTestSubj}"]`).click();
    } else {
      // Open context menu and click action. The menu renders in a portal outside the panel, so it
      // cannot be panel-scoped; filtering to the visible match skips the hidden quick-action
      // buttons that every other panel renders under the same test subject.
      await this.openPanelContextMenu(title);
      await this.page.testSubj.locator(actionTestSubj).filter({ visible: true }).click();
      // Wait for context menu to close after clicking the action
      await expect(this.page.testSubj.locator('embeddablePanelContextMenuOpen')).toBeHidden();
    }
  }
}
