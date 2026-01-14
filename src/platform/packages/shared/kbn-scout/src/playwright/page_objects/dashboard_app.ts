/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage } from '..';
import { Toasts } from './toasts';

type CommonlyUsedTimeRange =
  | 'Today'
  | 'Last_15 minutes'
  | 'Last_1 hour'
  | 'Last_24 hours'
  | 'Last_30 days'
  | 'Last_90 days'
  | 'Last_1 year';

export class DashboardApp {
  private readonly toasts: Toasts;

  constructor(private readonly page: ScoutPage) {
    this.toasts = new Toasts(page);
  }

  async goto() {
    await this.page.gotoApp('dashboards');
  }

  async waitForListingTableToLoad() {
    return this.page.testSubj.waitForSelector('table-is-ready', { state: 'visible' });
  }

  async openNewDashboard() {
    await this.page.testSubj.click('newItemButton');
    await this.page.testSubj.waitForSelector('emptyDashboardWidget', { state: 'visible' });
  }

  // ============================================================
  // View Mode Methods (mirrors FTR's dashboard page object)
  // ============================================================

  /**
   * Checks if the dashboard is in view mode.
   * Matches FTR's getIsInViewMode().
   */
  async getIsInViewMode(): Promise<boolean> {
    return this.page.testSubj.locator('dashboardEditMode').isVisible();
  }

  /**
   * Switches the dashboard to edit mode.
   * Matches FTR's switchToEditMode().
   */
  async switchToEditMode() {
    const isViewMode = await this.getIsInViewMode();
    if (isViewMode) {
      await this.page.testSubj.click('dashboardEditMode');
      // Wait for edit mode to be active (drag handles appear)
      await this.page.testSubj.waitForSelector('embeddablePanelDragHandle', { state: 'visible' });
    }
  }

  /**
   * Clicks the cancel button to exit edit mode without saving.
   * Matches FTR's clickCancelOutOfEditMode().
   */
  async clickCancelOutOfEditMode() {
    const isEditMode = await this.page.testSubj.locator('dashboardViewOnlyMode').isVisible();
    if (isEditMode) {
      await this.page.testSubj.click('dashboardViewOnlyMode');
      // Wait for view mode to be active
      await this.page.testSubj.waitForSelector('dashboardEditMode', { state: 'visible' });
    }
  }

  /**
   * Opens the "Add panel" flyout for selecting panel types to add to the dashboard.
   * Matches the FTR pattern from add_panel.ts openAddPanelFlyout().
   */
  async openAddPanelFlyout() {
    // Click top nav add menu button and wait for menu to appear
    await this.page.testSubj.click('dashboardAddTopNavButton');
    await this.page.testSubj.waitForSelector('dashboardOpenAddPanelFlyoutButton', {
      state: 'visible',
    });

    // Click to open the panel selection flyout and wait for it to appear
    await this.page.testSubj.click('dashboardOpenAddPanelFlyoutButton');
    await this.page.testSubj.waitForSelector('dashboardPanelSelectionFlyout', { state: 'visible' });
    await this.page.testSubj.waitForSelector('dashboardPanelSelectionList', { state: 'visible' });
  }

  async saveDashboard(name: string) {
    await this.page.testSubj.click('dashboardInteractiveSaveMenuItem');
    await this.page.testSubj.fill('savedObjectTitle', name);
    await this.page.testSubj.click('confirmSaveSavedObjectButton');
    await this.page.testSubj.waitForSelector('confirmSaveSavedObjectButton', { state: 'hidden' });
  }

  // ============================================================
  // Library Panel Methods (mirrors FTR's DashboardAddPanelService)
  // ============================================================

  /**
   * Opens the "Add from library" flyout.
   * Low-level building block used by addEmbeddable().
   */
  private async openLibraryFlyout() {
    await this.page.testSubj.click('dashboardAddTopNavButton');
    await this.page.testSubj.click('dashboardAddFromLibraryButton');
    await this.page.testSubj.waitForSelector('savedObjectsFinderTable', { state: 'visible' });
    await this.page.testSubj.waitForSelector('savedObjectFinderLoadingIndicator', {
      state: 'hidden',
      timeout: 30000,
    });
  }

  /**
   * Closes the library flyout.
   */
  private async closeLibraryFlyout() {
    await this.page.testSubj.click('euiFlyoutCloseButton');
    await this.page.testSubj.waitForSelector('euiFlyoutCloseButton', { state: 'hidden' });
  }

  /**
   * Searches and filters embeddables in the library flyout.
   * Uses Playwright's native type() to fire proper keyboard events.
   *
   * @param embeddableName - Name with dashes (e.g., 'Rendering-Test:-saved-search')
   * @param embeddableType - Optional type filter (e.g., 'search', 'Visualization')
   */
  private async filterEmbeddableNames(embeddableName: string, embeddableType?: string) {
    // Build search query exactly like FTR does:
    // type:(search) "Rendering Test:-saved-search" (only first dash replaced with space)
    const typePrefix = embeddableType ? `type:(${embeddableType}) ` : '';
    const searchQuery = `${typePrefix}"${embeddableName.replace('-', ' ')}"`;

    const searchInput = this.page.testSubj.locator('savedObjectFinderSearchInput');
    await searchInput.click();
    await searchInput.clear();
    // Use native type() which fires keydown/keyup/keypress events (not insertText)
    await searchInput.type(searchQuery, { delay: 50 });

    // Wait for search results to load
    await this.page.testSubj.waitForSelector('savedObjectFinderLoadingIndicator', {
      state: 'hidden',
      timeout: 30000,
    });
  }

  /**
   * Core method to add an embeddable from the library.
   * Mirrors FTR's dashboardAddPanel.addEmbeddable() exactly.
   *
   * @param embeddableName - Name with dashes (e.g., 'Rendering-Test:-saved-search')
   * @param embeddableType - Optional type filter (e.g., 'search', 'Visualization')
   */
  async addEmbeddable(embeddableName: string, embeddableType?: string) {
    await this.openLibraryFlyout();
    await this.filterEmbeddableNames(embeddableName, embeddableType);

    // Click on the saved object title
    // FTR uses: savedObjectTitle${embeddableName.split(' ').join('-')}
    const titleSelector = `savedObjectTitle${embeddableName.split(' ').join('-')}`;
    await this.page.testSubj.waitForSelector(titleSelector, { state: 'visible' });
    await this.page.testSubj.click(titleSelector);

    // Wait for success indicator
    await this.page.testSubj.waitForSelector('addEmbeddableToDashboardSuccess', {
      state: 'visible',
    });

    await this.closeLibraryFlyout();

    // Close "Added successfully" toast (matches FTR behavior)
    await this.toasts.closeAll();
  }

  /**
   * Adds a saved search to the dashboard.
   * Wrapper around addEmbeddable() with type='search'.
   *
   * @param searchName - Name with dashes (e.g., 'Rendering-Test:-saved-search')
   */
  async addSavedSearch(searchName: string) {
    return this.addEmbeddable(searchName, 'search');
  }

  /**
   * Adds a visualization to the dashboard.
   * Wrapper around addEmbeddable() with type='Visualization'.
   *
   * @param vizName - Name with dashes
   */
  async addVisualization(vizName: string) {
    return this.addEmbeddable(vizName, 'Visualization');
  }

  async customizePanel(options: {
    name: string;
    customTimeRageCommonlyUsed?: {
      value: CommonlyUsedTimeRange;
    };
  }) {
    await this.page.testSubj.hover(`embeddablePanelHeading-${options.name.replace(/ /g, '')}`);
    await this.page.testSubj.click('embeddablePanelAction-ACTION_CUSTOMIZE_PANEL');
    if (options.customTimeRageCommonlyUsed) {
      await this.page.testSubj.click('customizePanelShowCustomTimeRange');
      await this.page.testSubj.click(
        'customizePanelTimeRangeDatePicker > superDatePickerToggleQuickMenuButton'
      );
      await this.page.testSubj.click(
        `superDatePickerCommonlyUsed_${options.customTimeRageCommonlyUsed.value}`
      );
    }

    await this.page.testSubj.click('saveCustomizePanelButton');
    await this.page.testSubj.waitForSelector('saveCustomizePanelButton', { state: 'hidden' });
  }

  async removePanel(name: string | 'embeddableError') {
    const panelHeaderTestSubj =
      name === 'embeddableError' ? name : `embeddablePanelHeading-${name.replace(/ /g, '')}`;
    await this.page.testSubj.locator(panelHeaderTestSubj).scrollIntoViewIfNeeded();
    await this.page.testSubj.locator(panelHeaderTestSubj).hover();
    await this.page.testSubj.click('embeddablePanelToggleMenuIcon');
    await this.page.testSubj.click('embeddablePanelAction-deletePanel');
    await this.page.testSubj.waitForSelector(panelHeaderTestSubj, {
      state: 'hidden',
    });
  }

  async waitForPanelsToLoad(
    expectedCount: number,
    options: { timeout: number; selector: string } = {
      timeout: 20000,
      selector: '[data-test-subj="embeddablePanel"][data-render-complete="true"]',
    }
  ) {
    const startTime = Date.now();

    while (Date.now() - startTime < options.timeout) {
      const count = await this.page.locator(options.selector).count();
      if (count === expectedCount) return;
      // Short polling interval
      // eslint-disable-next-line playwright/no-wait-for-timeout
      await this.page.waitForTimeout(100);
    }

    throw new Error(`Timeout waiting for ${expectedCount} elements matching ${options.selector}`);
  }

  /**
   * Gets the titles of all panels on the dashboard
   */
  async getPanelTitles(): Promise<string[]> {
    const titleElements = await this.page.testSubj.locator('embeddablePanelTitle').all();
    return Promise.all(titleElements.map(async (el) => (await el.textContent()) ?? ''));
  }

  /**
   * Gets the count of panels on the dashboard
   */
  async getPanelCount(): Promise<number> {
    return this.page.testSubj.locator('embeddablePanel').count();
  }

  /**
   * Waits for all dashboard panels to finish rendering.
   * Uses the data-render-complete attribute to determine completion.
   */
  async waitForRenderComplete() {
    const panels = this.page.testSubj.locator('embeddablePanel');
    const count = await panels.count();
    if (count > 0) {
      // Wait for all panels to have data-render-complete="true"
      await this.waitForPanelsToLoad(count);
    }
  }

  // ============================================================
  // Panel Action Methods (mirrors FTR's DashboardPanelActionsService)
  // ============================================================

  /**
   * Formats a panel title for use in test subject selectors.
   * Matches FTR: title.replace(/\s/g, '')
   */
  private formatTitleForTestSubj(title: string): string {
    return title.replace(/\s/g, '');
  }

  /**
   * Gets the hover actions wrapper for a panel by title.
   * Matches FTR's getPanelWrapper(title).
   *
   * @param title - Panel title. If empty, finds first panel by class.
   */
  getPanelHoverActionsLocator(title?: string) {
    if (!title) {
      // FTR fallback: find first panel by class when no title provided
      return this.page.locator('.embPanel__hoverActionsAnchor');
    }
    return this.page.testSubj.locator(
      `embeddablePanelHoverActions-${this.formatTitleForTestSubj(title)}`
    );
  }

  /**
   * Opens the context menu for a panel.
   * Scrolls the panel into view and clicks the menu toggle.
   * Matches FTR's openContextMenu(wrapper).
   */
  async openPanelContextMenu(title?: string) {
    const panelWrapper = this.getPanelHoverActionsLocator(title);
    await panelWrapper.scrollIntoViewIfNeeded();
    await panelWrapper.hover();

    // Check if menu is already open
    const isOpen = await this.page.testSubj.locator('embeddablePanelContextMenuOpen').isVisible();
    if (!isOpen) {
      // FTR: wrapper.findByTestSubject('embeddablePanelToggleMenuIcon')
      // Click the menu icon INSIDE the panel wrapper, not globally
      const menuIcon = panelWrapper.locator('[data-test-subj="embeddablePanelToggleMenuIcon"]');
      await menuIcon.click();
      await this.page.testSubj.waitForSelector('embeddablePanelContextMenuOpen', {
        state: 'visible',
      });
    }
  }

  /**
   * Checks if a panel action exists as a descendant of the panel wrapper.
   * Matches FTR's panelActionExists() which uses descendantExists.
   */
  private async panelActionExistsInWrapper(
    actionTestSubj: string,
    panelWrapper: ReturnType<typeof this.getPanelHoverActionsLocator>
  ): Promise<boolean> {
    // Check if the action is a descendant of the panel wrapper (not globally visible)
    const actionInPanel = panelWrapper.locator(`[data-test-subj="${actionTestSubj}"]`);
    return actionInPanel.isVisible();
  }

  /**
   * Clicks a panel action from the hover actions or context menu.
   * Matches FTR's clickPanelAction(testSubject, wrapper).
   *
   * Key difference from before: checks if action is DESCENDANT of panel wrapper,
   * not just globally visible. This prevents clicking wrong panel's actions.
   */
  async clickPanelAction(actionTestSubj: string, title?: string) {
    const panelWrapper = this.getPanelHoverActionsLocator(title);
    await panelWrapper.scrollIntoViewIfNeeded();
    await panelWrapper.hover();

    // Check if action exists as descendant of panel wrapper (FTR pattern)
    const existsInWrapper = await this.panelActionExistsInWrapper(actionTestSubj, panelWrapper);

    if (existsInWrapper) {
      // Click the action within the panel wrapper
      const actionInPanel = panelWrapper.locator(`[data-test-subj="${actionTestSubj}"]`);
      await actionInPanel.click();
    } else {
      // Open context menu and click action
      await this.openPanelContextMenu(title);
      await this.page.testSubj.click(actionTestSubj);
    }
  }

  /**
   * Clones a panel on the dashboard.
   * The cloned panel becomes a "by value" panel (not linked to library).
   * Matches FTR's clonePanel(title) + the extra waits FTR does in tests.
   */
  async clonePanel(title?: string) {
    await this.clickPanelAction('embeddablePanelAction-clonePanel', title);
    await this.waitForRenderComplete();
    // FTR tests also call these after clonePanel to ensure panel state is updated
    await this.page.waitForLoadingIndicatorHidden();
    await this.waitForRenderComplete();
  }

  /**
   * Unlinks a panel from the library, converting it to a "by value" panel.
   * Matches FTR's unlinkFromLibrary(title) - includes verification.
   */
  async unlinkFromLibrary(title?: string) {
    await this.clickPanelAction('embeddablePanelAction-unlinkFromLibrary', title);
    await this.page.testSubj.waitForSelector('unlinkPanelSuccess', { state: 'visible' });
    // FTR also verifies the panel is now unlinked
    await this.expectNotLinkedToLibrary(title);
  }

  /**
   * Saves a panel to the library with a new title.
   * Matches FTR's saveToLibrary(newTitle, oldTitle) - includes verification.
   */
  async saveToLibrary(newTitle: string, currentTitle?: string) {
    await this.clickPanelAction('embeddablePanelAction-saveToLibrary', currentTitle);

    // Fill in the new title
    await this.page.testSubj.fill('savedObjectTitle', newTitle);
    await this.page.testSubj.click('confirmSaveSavedObjectButton');

    // Wait for success
    await this.page.testSubj.waitForSelector('addPanelToLibrarySuccess', { state: 'visible' });
    // FTR also verifies the panel is now linked
    await this.expectLinkedToLibrary(newTitle);
  }

  /**
   * Checks if a panel has a specific action available.
   * Checks both hover actions and context menu.
   * Matches FTR's panelActionExists pattern.
   *
   * Uses count() > 0 to match FTR's allowHidden: true behavior
   * (finds elements even if not visible).
   */
  async panelHasAction(actionTestSubj: string, title?: string): Promise<boolean> {
    const panelWrapper = this.getPanelHoverActionsLocator(title);
    await panelWrapper.scrollIntoViewIfNeeded();
    await panelWrapper.hover();

    // Check if action exists in panel wrapper (hover actions)
    // Using count() to match FTR's allowHidden: true behavior
    const existsInWrapper = await this.panelActionExistsInWrapper(actionTestSubj, panelWrapper);
    if (existsInWrapper) {
      return true;
    }

    // Check in context menu
    await this.openPanelContextMenu(title);
    // Use count() > 0 to find elements even if hidden (matches FTR's allowHidden: true)
    const actionInMenu = this.page.testSubj.locator(actionTestSubj);
    const count = await actionInMenu.count();

    // Close menu by pressing Escape
    await this.page.keyboard.press('Escape');
    return count > 0;
  }

  /**
   * Asserts that a panel action exists (throws if not found).
   * Matches FTR's expectExistsPanelAction().
   */
  async expectExistsPanelAction(actionTestSubj: string, title?: string) {
    const exists = await this.panelHasAction(actionTestSubj, title);
    if (!exists) {
      // Collect available actions for better error message
      await this.openPanelContextMenu(title);
      const allActions = await this.page
        .locator('[data-test-subj^="embeddablePanelAction-"]')
        .all();
      const actionNames: string[] = [];
      for (const action of allActions) {
        const testSubj = await action.getAttribute('data-test-subj');
        if (testSubj) actionNames.push(testSubj);
      }
      await this.page.keyboard.press('Escape');

      throw new Error(
        `Expected panel action "${actionTestSubj}" to exist for panel "${
          title || 'first panel'
        }". Available actions: [${actionNames.join(', ')}]`
      );
    }
  }

  /**
   * Verifies a panel is linked to the library.
   * A linked panel has the "Unlink from library" action available.
   * Matches FTR's expectLinkedToLibrary(title).
   *
   * FTR switches to edit mode before checking because library actions
   * may not be available in view mode.
   */
  async expectLinkedToLibrary(title?: string) {
    // FTR checks view mode and switches to edit mode if needed
    const isViewMode = await this.getIsInViewMode();
    if (isViewMode) {
      await this.switchToEditMode();
    }

    await this.expectExistsPanelAction('embeddablePanelAction-unlinkFromLibrary', title);

    // Restore view mode if we switched
    if (isViewMode) {
      await this.clickCancelOutOfEditMode();
    }
  }

  /**
   * Verifies a panel is NOT linked to the library.
   * A non-linked panel has the "Save to library" action available.
   * Matches FTR's expectNotLinkedToLibrary(title).
   *
   * FTR switches to edit mode before checking because library actions
   * may not be available in view mode.
   */
  async expectNotLinkedToLibrary(title?: string) {
    // FTR checks view mode and switches to edit mode if needed
    const isViewMode = await this.getIsInViewMode();
    if (isViewMode) {
      await this.switchToEditMode();
    }

    await this.expectExistsPanelAction('embeddablePanelAction-saveToLibrary', title);

    // Restore view mode if we switched
    if (isViewMode) {
      await this.clickCancelOutOfEditMode();
    }
  }
}
