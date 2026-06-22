/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Locator, PageObjects, ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import {
  SECURITY_DATA_VIEWS,
  SECURITY_FLYOUT_TEST_SUBJECTS as TS,
  SECURITY_SAVED_SEARCH_TITLE,
  TAKE_ACTION_TEST_SUBJECTS as TA,
} from '../constants';

/**
 * Page object for the Security Solution flyout content rendered inside Discover's document viewer.
 *
 * In Discover the security flyout is the standard `UnifiedDocViewerFlyout` enhanced by the Security
 * context-awareness profile — NOT the alerts-table system flyout. The entry point is therefore a
 * Discover (or Dashboard-embedded Discover) row expansion; once open, the injected header / overview
 * tab / footer reuse the same `data-test-subj`s as the alerts-table flyout, so the locators below are
 * shared with the security_solution flyout_v2 suite.
 */
export class SecurityDiscoverFlyout {
  /** Discover doc viewer flyout container. */
  public readonly flyout: Locator;
  /** Doc viewer content inside the flyout. */
  public readonly docViewer: Locator;
  /** Alert / event header title. */
  public readonly alertTitle: Locator;
  /** Header title icon (alerts: `warning`; events: `analyzeEvent`), via `data-icon-type`. */
  public readonly titleIcon: Locator;
  /** Severity badge in the header. */
  public readonly severity: Locator;
  /** Workflow status badge in the header. */
  public readonly statusBadge: Locator;
  /** Risk score value in the header. */
  public readonly riskScore: Locator;
  /** Overview tab "About" section header. */
  public readonly aboutSection: Locator;
  /** Overview tab "Investigation" section header. */
  public readonly investigationSection: Locator;
  /** Overview tab "Visualizations" section header. */
  public readonly visualizationsSection: Locator;
  /** Overview tab "Insights" section header. */
  public readonly insightsSection: Locator;
  /** Overview tab "Response" section header. */
  public readonly responseSection: Locator;
  /** "Show rule summary" button (opens the rule child flyout). */
  public readonly ruleSummaryButton: Locator;
  /** Highlighted fields table in the Investigation section. */
  public readonly highlightedFieldsTable: Locator;
  /** "Filter for" cell action in the highlighted-field hover popover. */
  public readonly cellActionFilterIn: Locator;
  /** "Filter out" cell action in the highlighted-field hover popover. */
  public readonly cellActionFilterOut: Locator;
  /** "Filter exists" cell action in the highlighted-field hover popover. */
  public readonly cellActionFilterExists: Locator;
  /** "Toggle column" cell action in the highlighted-field hover popover. */
  public readonly cellActionToggleColumn: Locator;
  /** "Copy to clipboard" cell action in the highlighted-field hover popover. */
  public readonly cellActionCopy: Locator;
  /** Take action footer button (alert / event document flyout). */
  public readonly takeActionButton: Locator;
  /** Take action context menu panel (alert / event). */
  public readonly takeActionMenu: Locator;
  /** Take action footer button (IOC flyout — separate menu). */
  public readonly iocTakeActionButton: Locator;
  /** "Closing reason" sub-panel opened from the status action. */
  public readonly closingReasonPanel: Locator;
  /** Alert tags selection sub-panel. */
  public readonly alertTagsPanel: Locator;
  /** Alert assignees selection sub-panel. */
  public readonly alertAssigneesPanel: Locator;
  /** "Add to existing case" case-selector modal. */
  public readonly allCasesModal: Locator;
  /** "Create case" dialog heading (scoped to the dialog; the title also appears on the submit button). */
  public readonly createCaseDialogTitle: Locator;
  /** Doc viewer "Overview" tab button (security-injected, alert/event). */
  public readonly overviewTab: Locator;
  /** Doc viewer "Overview" tab button (security-injected, IOC). */
  public readonly iocOverviewTab: Locator;
  /** Doc viewer "Table" tab button (Discover default). */
  public readonly tableTab: Locator;
  /** Doc viewer "JSON" tab button (Discover default). */
  public readonly jsonTab: Locator;
  /** Field table grid rendered by the "Table" tab. */
  public readonly tableTabContent: Locator;
  /** IOC overview tab title. */
  public readonly iocOverviewTitle: Locator;
  /** IOC overview high-level blocks. */
  public readonly iocOverviewHighLevelBlocks: Locator;

  private readonly page: ScoutPage;
  private readonly discover: PageObjects['discover'];
  private readonly dashboard: PageObjects['dashboard'];

  constructor(
    page: ScoutPage,
    discover: PageObjects['discover'],
    dashboard: PageObjects['dashboard']
  ) {
    this.page = page;
    this.discover = discover;
    this.dashboard = dashboard;

    this.flyout = page.testSubj.locator(TS.DOC_VIEWER_FLYOUT);
    this.docViewer = page.testSubj.locator(TS.DOC_VIEWER);
    this.alertTitle = page.testSubj.locator(TS.ALERT_TITLE);
    this.titleIcon = page.testSubj.locator(TS.TITLE_ICON);
    this.severity = page.testSubj.locator(TS.SEVERITY);
    this.statusBadge = page.testSubj.locator(TS.STATUS_BADGE);
    this.riskScore = page.testSubj.locator(TS.RISK_SCORE);
    this.aboutSection = page.testSubj.locator(TS.ABOUT_SECTION);
    this.investigationSection = page.testSubj.locator(TS.INVESTIGATION_SECTION);
    this.visualizationsSection = page.testSubj.locator(TS.VISUALIZATIONS_SECTION);
    this.insightsSection = page.testSubj.locator(TS.INSIGHTS_SECTION);
    this.responseSection = page.testSubj.locator(TS.RESPONSE_SECTION);
    this.ruleSummaryButton = page.testSubj.locator(TS.RULE_SUMMARY_BUTTON);
    this.highlightedFieldsTable = page.testSubj.locator(TS.HIGHLIGHTED_FIELDS_TABLE);
    this.cellActionFilterIn = page.testSubj.locator(TS.CELL_ACTION_FILTER_IN);
    this.cellActionFilterOut = page.testSubj.locator(TS.CELL_ACTION_FILTER_OUT);
    this.cellActionFilterExists = page.testSubj.locator(TS.CELL_ACTION_FILTER_EXISTS);
    this.cellActionToggleColumn = page.testSubj.locator(TS.CELL_ACTION_TOGGLE_COLUMN);
    this.cellActionCopy = page.testSubj.locator(TS.CELL_ACTION_COPY);
    this.takeActionButton = page.testSubj.locator(TS.TAKE_ACTION_BUTTON);
    this.takeActionMenu = page.testSubj.locator(TA.MENU);
    this.iocTakeActionButton = page.testSubj.locator(TA.IOC_BUTTON);
    this.closingReasonPanel = page.testSubj.locator(TA.CLOSING_REASON_PANEL);
    this.alertTagsPanel = page.testSubj.locator(TA.ALERT_TAGS_PANEL);
    this.alertAssigneesPanel = page.testSubj.locator(TA.ALERT_ASSIGNEES_PANEL);
    this.allCasesModal = page.testSubj.locator(TA.ALL_CASES_MODAL);
    this.createCaseDialogTitle = page
      .getByRole('dialog')
      .getByRole('heading', { name: 'Create case' });
    this.overviewTab = page.testSubj.locator(TS.OVERVIEW_TAB);
    this.iocOverviewTab = page.testSubj.locator(TS.IOC_OVERVIEW_TAB);
    this.tableTab = page.testSubj.locator(TS.TABLE_TAB);
    this.jsonTab = page.testSubj.locator(TS.JSON_TAB);
    this.tableTabContent = page.testSubj.locator(TS.TABLE_TAB_CONTENT);
    this.iocOverviewTitle = page.testSubj.locator(TS.IOC_OVERVIEW_TITLE);
    this.iocOverviewHighLevelBlocks = page.testSubj.locator(TS.IOC_OVERVIEW_HIGH_LEVEL_BLOCKS);
  }

  /** Navigate to Discover, select the data view, and expand a row to open the doc viewer flyout. */
  async openFlyoutFromDiscover(dataView: string, rowIndex = 0) {
    await this.discover.goto();
    await this.discover.selectDataView(dataView);
    await this.discover.waitForDocTableRendered();
    await this.discover.openAndWaitForDocViewerFlyout({ rowIndex });
    await this.waitForFlyout();
  }

  /** Open the alert flyout from a Discover row. */
  async openAlertFlyoutFromDiscover(rowIndex = 0) {
    await this.openFlyoutFromDiscover(SECURITY_DATA_VIEWS.ALERTS, rowIndex);
  }

  /** Open the event flyout from a Discover row. */
  async openEventFlyoutFromDiscover(rowIndex = 0) {
    await this.openFlyoutFromDiscover(SECURITY_DATA_VIEWS.EVENTS, rowIndex);
  }

  /** Open the IOC flyout from a Discover row. */
  async openIocFlyoutFromDiscover(rowIndex = 0) {
    await this.openFlyoutFromDiscover(SECURITY_DATA_VIEWS.IOCS, rowIndex);
  }

  /**
   * Build a dashboard with the alerts saved-search panel, then expand a row to open the doc viewer
   * flyout — exercises the Discover-embedded-in-Dashboard entry point.
   */
  async openAlertFlyoutFromDashboard(rowIndex = 0) {
    await this.dashboard.openNewDashboard();
    await this.dashboard.addSavedSearch(SECURITY_SAVED_SEARCH_TITLE);
    await this.dashboard.waitForRenderComplete();
    // The saved-search embeddable renders the same unified data table; the page-scoped expand-button
    // locator used by the Discover page object resolves to the panel's grid.
    await this.discover.openAndWaitForDocViewerFlyout({ rowIndex });
    await this.waitForFlyout();
  }

  /** Wait for the doc viewer flyout to be visible and rendered. */
  async waitForFlyout() {
    await expect(this.flyout).toBeVisible({ timeout: 30_000 });
    await expect(this.docViewer).toBeVisible({ timeout: 30_000 });
  }

  /** Wait for the alert / event header (confirms the security profile enhanced the flyout). */
  async waitForAlertHeader() {
    await expect(this.alertTitle).toBeVisible({ timeout: 30_000 });
  }

  /** Wait for the IOC overview tab content. */
  async waitForIocOverview() {
    await expect(this.iocOverviewTitle).toBeVisible({ timeout: 30_000 });
  }

  /** Click a doc viewer tab and wait for it to become the selected (active) tab. */
  async selectTab(tab: Locator) {
    await tab.click();
    await expect(tab).toHaveAttribute('aria-selected', 'true');
  }

  /**
   * Hover the cell-actions-enabled value for `field` in the highlighted fields table, opening the
   * Discover cell-actions popover. The popover closes shortly after the cursor leaves and after a
   * button is clicked, so re-call this before each action.
   */
  async hoverHighlightedFieldValue(field: string) {
    await expect(this.highlightedFieldsTable).toBeVisible({ timeout: 30_000 });
    // Each highlighted-field row wraps its (single) value in the cell-actions popover anchor.
    const anchor = this.highlightedFieldsTable
      .locator('tr')
      .filter({ hasText: field })
      .locator(`[data-test-subj="${TS.CELL_ACTIONS_POPOVER}"]`);
    await anchor.scrollIntoViewIfNeeded();
    await anchor.hover();
    // Moving the cursor to the value crosses neighbouring cell-action values, briefly opening their
    // popovers too (they auto-close ~100ms after the cursor leaves). Wait for only the hovered
    // value's popover to remain so the action-button locators resolve to a single element.
    await expect(this.cellActionFilterIn).toHaveCount(1, { timeout: 15_000 });
  }

  /** Open the alert/event take action footer menu and wait for the context menu. */
  async openTakeActionMenu() {
    await this.takeActionButton.click();
    await expect(this.takeActionMenu).toBeVisible({ timeout: 15_000 });
  }

  /** Open the IOC take action footer menu. */
  async openIocTakeActionMenu() {
    await this.iocTakeActionButton.click();
  }

  /** Locator for a take action menu item by its test subject. */
  takeActionItem(testSubj: string): Locator {
    return this.page.testSubj.locator(testSubj);
  }

  /** Click a take action menu item by its test subject. */
  async clickTakeActionItem(testSubj: string) {
    await this.takeActionItem(testSubj).click();
  }
}
