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
import type { DiscoverPageObjects } from '../../../../common/ui/fixtures';
import {
  SECURITY_DATA_VIEWS,
  SECURITY_FLYOUT_TEST_SUBJECTS as TS,
  SECURITY_SAVED_SEARCH_TITLE,
  TAKE_ACTION_TEST_SUBJECTS as TA,
  CELL_RENDERER_TEST_SUBJECTS as CR,
} from '../constants';

// Raised from the default: opening the flyout depends on Discover's first load + security profile
// resolution + the lazy-loaded security flyout content, which is slow in CI.
const FLYOUT_TIMEOUT = 30_000;

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
  /** Highlighted fields table in the Investigation section. */
  public readonly highlightedFieldsTable: Locator;
  /** "Filter for" cell action in the highlighted-field hover popover. */
  public readonly cellActionFilterIn: Locator;
  /** "Toggle column" cell action in the highlighted-field hover popover. */
  public readonly cellActionToggleColumn: Locator;
  /** Take action footer button (alert / event document flyout). */
  public readonly takeActionButton: Locator;
  /** Take action context menu panel (alert / event). */
  public readonly takeActionMenu: Locator;
  /** Doc viewer "Overview" tab button (security-injected, alert/event). */
  public readonly overviewTab: Locator;
  /** Doc viewer "Overview" tab button (security-injected, Attack Discovery). */
  public readonly attackOverviewTab: Locator;
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
  /** Attack Discovery title rendered by the injected header. */
  public readonly attackHeaderTitle: Locator;
  /** Attack Discovery overview content rendered by the injected tab. */
  public readonly attackOverview: Locator;
  /** Grid cell link rendered by the rule-name cell renderer. */
  public readonly ruleNameCellLink: Locator;
  /** Grid cell link rendered by the IP cell renderer. */
  public readonly ipCellLink: Locator;
  /** Network details flyout title (opened from the IP cell renderer link). */
  public readonly networkFlyoutTitle: Locator;
  /** Grid cell link rendered by the host cell renderer. */
  public readonly hostCellLink: Locator;
  /** Host system-flyout header opened from the host cell renderer. */
  public readonly hostFlyoutHeader: Locator;
  /** Grid cell link rendered by the user cell renderer. */
  public readonly userCellLink: Locator;
  /** User system-flyout header opened from the user cell renderer. */
  public readonly userFlyoutHeader: Locator;

  private readonly page: ScoutPage;
  private readonly dataGrid: PageObjects['dataGrid'];
  private readonly docViewerPageObject: DiscoverPageObjects['docViewer'];
  private readonly discover: PageObjects['discover'];
  private readonly dashboard: PageObjects['dashboard'];

  constructor(
    page: ScoutPage,
    dataGrid: PageObjects['dataGrid'],
    docViewerPageObject: DiscoverPageObjects['docViewer'],
    discover: PageObjects['discover'],
    dashboard: PageObjects['dashboard']
  ) {
    this.page = page;
    this.dataGrid = dataGrid;
    this.docViewerPageObject = docViewerPageObject;
    this.discover = discover;
    this.dashboard = dashboard;

    this.flyout = page.testSubj.locator(TS.DOC_VIEWER_FLYOUT);
    this.docViewer = page.testSubj.locator(TS.DOC_VIEWER);
    this.alertTitle = page.testSubj.locator(TS.ALERT_TITLE);
    this.highlightedFieldsTable = page.testSubj.locator(TS.HIGHLIGHTED_FIELDS_TABLE);
    this.cellActionFilterIn = page.testSubj.locator(TS.CELL_ACTION_FILTER_IN);
    this.cellActionToggleColumn = page.testSubj.locator(TS.CELL_ACTION_TOGGLE_COLUMN);
    this.takeActionButton = page.testSubj.locator(TS.TAKE_ACTION_BUTTON);
    this.takeActionMenu = page.testSubj.locator(TA.MENU);
    this.overviewTab = page.testSubj.locator(TS.OVERVIEW_TAB);
    this.attackOverviewTab = page.testSubj.locator(TS.ATTACK_OVERVIEW_TAB);
    this.iocOverviewTab = page.testSubj.locator(TS.IOC_OVERVIEW_TAB);
    this.tableTab = page.testSubj.locator(TS.TABLE_TAB);
    this.jsonTab = page.testSubj.locator(TS.JSON_TAB);
    this.tableTabContent = page.testSubj.locator(TS.TABLE_TAB_CONTENT);
    this.iocOverviewTitle = page.testSubj.locator(TS.IOC_OVERVIEW_TITLE);
    this.attackHeaderTitle = page.testSubj.locator(TS.ATTACK_HEADER_TITLE);
    this.attackOverview = page.testSubj.locator(TS.ATTACK_OVERVIEW);
    const dataGridBody = page.testSubj.locator('euiDataGridBody');
    this.ruleNameCellLink = dataGridBody.locator(`[data-test-subj="${CR.RULE_NAME_LINK}"]`);
    this.ipCellLink = dataGridBody.locator(`[data-test-subj="${CR.IP_LINK}"]`);
    this.networkFlyoutTitle = page.testSubj.locator(CR.NETWORK_FLYOUT_TITLE);
    this.hostCellLink = dataGridBody.locator(`[data-test-subj="${CR.HOST_LINK}"]`);
    this.hostFlyoutHeader = page.testSubj.locator(CR.HOST_FLYOUT_HEADER);
    this.userCellLink = dataGridBody.locator(`[data-test-subj="${CR.USER_LINK}"]`);
    this.userFlyoutHeader = page.testSubj.locator(CR.USER_FLYOUT_HEADER);
  }

  private async selectDataView(name: string) {
    const discoverSwitch = this.page.testSubj.locator('discover-dataView-switch-link');
    const fallbackSwitch = this.page.testSubj.locator('dataView-switch-link');
    const dataViewSwitch = (await discoverSwitch.isVisible()) ? discoverSwitch : fallbackSwitch;

    if ((await dataViewSwitch.innerText()).trim() === name) {
      return;
    }

    await dataViewSwitch.click();
    const switcher = this.page.testSubj.locator('indexPattern-switcher');
    await switcher.waitFor({ state: 'visible' });

    const searchInput = this.page.testSubj.locator('indexPattern-switcher--input');
    await searchInput.waitFor({ state: 'visible' });
    await searchInput.fill(name);

    const matchingDataView = switcher.locator(`[data-test-subj="dataView-${name}"]`);
    await matchingDataView.waitFor({ state: 'visible', timeout: FLYOUT_TIMEOUT });
    await matchingDataView.click();
    await switcher.waitFor({ state: 'hidden' });
  }

  /** Navigate to Discover, select the data view, and expand a row to open the doc viewer flyout. */
  async openFlyoutFromDiscover(dataView: string, rowIndex = 0) {
    await this.discover.goto({ queryMode: 'classic' });
    await this.selectDataView(dataView);
    await this.discover.waitUntilSearchingHasFinished();
    await this.dataGrid.waitForDocTableRendered();
    await this.docViewerPageObject.openAndWaitForFlyout({ rowIndex });
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

  /** Open the Attack Discovery flyout from a Discover row. */
  async openAttackFlyoutFromDiscover(rowIndex = 0) {
    await this.openFlyoutFromDiscover(SECURITY_DATA_VIEWS.ATTACKS, rowIndex);
  }

  /** Open the IOC flyout from a Discover row. */
  async openIocFlyoutFromDiscover(rowIndex = 0) {
    await this.openFlyoutFromDiscover(SECURITY_DATA_VIEWS.IOCS, rowIndex);
  }

  /**
   * Open the cell-renderers saved search and wait for its grid to render. The saved search points at
   * an alerts-pattern data view (so the security profile registers its custom cell renderers) and
   * pins the rule-name, source-IP, host, and user columns, so each custom renderer has exactly one
   * cell in the grid.
   */
  async openCellRenderersSavedSearch(savedSearchId: string) {
    await this.page.gotoApp('discover', { hash: `/view/${savedSearchId}` });
    await this.dataGrid.waitForDocTableRendered();
  }

  private async activateGridCellLink(link: Locator, testSubject: string) {
    // EUI Data Grid requires entering cell interaction mode before nested links receive clicks.
    const gridCell = link.locator('xpath=ancestor::*[@role="gridcell"]');
    await gridCell.focus();
    await gridCell.press('Enter');
    const expansionPopover = this.page.testSubj.locator('euiDataGridExpansionPopover');
    await expansionPopover.locator(`[data-test-subj="${testSubject}"]`).click();
  }

  async openRuleFlyoutFromCell() {
    await this.activateGridCellLink(this.ruleNameCellLink, CR.RULE_NAME_LINK);
  }

  async openNetworkFlyoutFromCell() {
    await this.activateGridCellLink(this.ipCellLink, CR.IP_LINK);
  }

  async openHostFlyoutFromCell() {
    await this.activateGridCellLink(this.hostCellLink, CR.HOST_LINK);
  }

  async openUserFlyoutFromCell() {
    await this.activateGridCellLink(this.userCellLink, CR.USER_LINK);
  }

  /**
   * Build a dashboard with the alerts saved-search panel, then expand a row to open the doc viewer
   * flyout — exercises the Discover-embedded-in-Dashboard entry point.
   */
  async openAlertFlyoutFromDashboard(rowIndex = 0) {
    await this.dashboard.openNewDashboard();
    await this.dashboard.addSavedSearch(SECURITY_SAVED_SEARCH_TITLE);
    await this.dashboard.waitForRenderComplete();
    // The saved-search embeddable renders the same unified data table; the page-scoped row-toggle
    // locator used by the doc viewer page object resolves to the panel's grid.
    await this.dataGrid.waitForDocTableRendered();
    await this.docViewerPageObject.openAndWaitForFlyout({ rowIndex });
    await this.waitForFlyout();
  }

  /** Wait for the doc viewer flyout to be visible and rendered. */
  async waitForFlyout() {
    await this.flyout.waitFor({ state: 'visible', timeout: FLYOUT_TIMEOUT });
    await this.docViewer.waitFor({ state: 'visible', timeout: FLYOUT_TIMEOUT });
  }

  /** Wait for the alert / event header (confirms the security profile enhanced the flyout). */
  async waitForDocumentHeader() {
    await this.alertTitle.waitFor({ state: 'visible', timeout: FLYOUT_TIMEOUT });
  }

  /** Wait for the IOC overview tab content. */
  async waitForIocOverview() {
    await this.iocOverviewTitle.waitFor({ state: 'visible', timeout: FLYOUT_TIMEOUT });
  }

  /** Click a doc viewer tab (assert the resulting active tab / content in the spec). */
  async selectTab(tab: Locator) {
    await tab.click();
  }

  /**
   * Hover the cell-actions-enabled value for `field` in the highlighted fields table, opening the
   * Discover cell-actions popover. The popover closes shortly after the cursor leaves and after a
   * button is clicked, so re-call this before each action.
   */
  async hoverHighlightedFieldValue(field: string) {
    // The flyout is already open (header awaited); the highlighted fields table is part of the
    // overview content, so the default timeout is sufficient.
    await this.highlightedFieldsTable.waitFor({ state: 'visible' });
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
    await expect(this.cellActionFilterIn).toHaveCount(1);
  }

  /** Open the alert/event take action footer menu and wait for the context menu. */
  async openTakeActionMenu() {
    await this.takeActionButton.click();
    await this.takeActionMenu.waitFor({ state: 'visible' });
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
