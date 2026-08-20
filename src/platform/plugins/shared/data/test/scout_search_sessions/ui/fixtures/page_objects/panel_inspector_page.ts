/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Locator, ScoutPage } from '@kbn/scout';

const INSPECTOR_PANEL = 'inspectorPanel';
const INSPECTOR_VIEW_CHOOSER = 'inspectorViewChooser';
const INSPECTOR_REQUESTS_VIEW = 'inspectorViewChooserRequests';
const INSPECTOR_SEARCH_SESSION_ID = 'inspectorRequestSearchSessionId';
const INSPECTOR_CLOSE_BUTTON = 'euiFlyoutCloseButton';
const OPEN_INSPECTOR_ACTION = 'embeddablePanelAction-openInspector';
// The "..." overflow button that reveals less-frequently-used panel actions.
const CONTEXT_MENU_TOGGLE = 'embeddablePanelToggleMenuIcon';

/**
 * Reads the search session id a panel or Discover tab used for its last request, via the
 * inspector's Requests view. This is the only place the UI surfaces the session id, so it is
 * how the session-sharing specs tell "reused the session" from "started a new one".
 *
 * Scout has no shared inspector page object yet; this covers only what these specs need.
 */
export class PanelInspectorPage {
  public readonly panel: Locator;
  public readonly searchSessionId: Locator;
  private readonly viewChooser: Locator;

  constructor(private readonly page: ScoutPage) {
    this.panel = this.page.testSubj.locator(INSPECTOR_PANEL);
    this.searchSessionId = this.page.testSubj.locator(INSPECTOR_SEARCH_SESSION_ID);
    this.viewChooser = this.page.testSubj.locator(INSPECTOR_VIEW_CHOOSER);
  }

  /** Open the inspector flyout for the dashboard panel with the given title. */
  async openForPanel(title: string) {
    // Hover actions are keyed by the panel title with whitespace stripped.
    const hoverActions = this.page.testSubj.locator(
      `embeddablePanelHoverActions-${title.replace(/\s/g, '')}`
    );
    await hoverActions.scrollIntoViewIfNeeded();
    await hoverActions.hover();

    // Dashboard panels keep the inspector under the "..." overflow menu rather than in the
    // hover toolbar itself.
    await hoverActions.getByTestId(CONTEXT_MENU_TOGGLE).click();
    await this.page.testSubj.click(OPEN_INSPECTOR_ACTION);
    await this.panel.waitFor({ state: 'visible' });
  }

  /** Switch the open inspector to its Requests view. */
  async showRequestsView() {
    await this.panel.waitFor({ state: 'visible' });
    await this.viewChooser.click();
    await this.page.testSubj.click(INSPECTOR_REQUESTS_VIEW);
  }

  async close() {
    await this.panel.getByTestId(INSPECTOR_CLOSE_BUTTON).click();
    await this.panel.waitFor({ state: 'hidden' });
  }

  /**
   * The search session id behind the given dashboard panel's most recent request.
   * Never returns an empty value — a missing id means the inspector changed shape and the
   * spec's comparison would be meaningless.
   */
  async getSearchSessionIdByPanelTitle(title: string): Promise<string> {
    await this.openForPanel(title);
    await this.showRequestsView();
    const sessionId = await this.searchSessionId.getAttribute('data-search-session-id');
    await this.close();
    if (!sessionId) {
      throw new Error(`No search session id exposed by the inspector for panel "${title}"`);
    }
    return sessionId;
  }

  /**
   * The search session id behind the active Discover tab's most recent request. Callers open
   * the inspector first via `unifiedTabs.openInspectorForActiveTab()`.
   */
  async readSearchSessionId(): Promise<string> {
    await this.showRequestsView();
    const sessionId = await this.searchSessionId.getAttribute('data-search-session-id');
    await this.close();
    if (!sessionId) {
      throw new Error('No search session id exposed by the inspector');
    }
    return sessionId;
  }
}
