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
import { LOGS } from '../constants';

/** Leading controls the logs data source profile contributes to each data-grid row. */
const QUALITY_ISSUE_CONTROL = 'docTableDegradedDocExist';
const STACKTRACE_CONTROL = 'docTableStacktraceExist';

/** Log overview sections in the doc viewer flyout. */
const QUALITY_ISSUES_ACCORDION = 'unifiedDocViewLogsOverviewDegradedFieldsAccordion';
const STACKTRACE_ACCORDION = 'unifiedDocViewLogsOverviewStacktraceAccordion';

/** Row colour indicator column, also contributed by the profile. */
const COLOR_INDICATOR_COLUMN_ID = 'colorIndicator';
const ROW_COLOR_INDICATOR = 'unifiedDataTableRowColorIndicatorCell';

/**
 * Cell renderers the profile contributes. The log-level badge's test subject is suffixed with the
 * coalesced level, which is also what its colour is derived from, so matching the exact subject
 * covers the rendered colour without pinning a theme-dependent RGB value.
 */
const LOG_LEVEL_BADGE_PREFIX = 'logLevelBadgeCell-';
const SERVICE_NAME_CELL = 'dataTableCellActionsPopover_service.name';
const SUMMARY_MESSAGE_VALUE = 'discoverDataTableMessageValue';

const DOC_TABLE = 'discoverDocTable';
const SAMPLE_SIZE_FOOTER = 'unifiedDataTableFooter';
const LOAD_MORE_LINK = 'dscGridSampleSizeFetchMoreLink';
const ANCHOR_EXPAND_BUTTON = 'docTableExpandToggleColumnAnchor';
const SINGLE_DOCUMENT = 'doc-hit';
const ALERTS_MENU_BUTTON = 'discoverAlertsButton';
const RULE_TYPE_NAME = 'ruleDefinitionHeaderRuleTypeName';
const CREATE_SLO_FLYOUT_TITLE = 'addSLOFlyoutTitle';

export class LogsExperiencePage {
  /** Header of the Log overview tab's content, rendered once that tab is selected. */
  public readonly logsOverviewHeader: Locator;

  /** `singlePage` footer reporting the sample size, and its link to fetch the next sample. */
  public readonly sampleSizeFooter: Locator;
  public readonly loadMoreLink: Locator;

  public readonly alertsMenuButton: Locator;

  /** What the Alerts menu items open: the rule form's type name and the Create SLO flyout title. */
  public readonly ruleTypeName: Locator;
  public readonly createSloFlyoutTitle: Locator;

  /** Log overview accordion containers. Absent from the DOM while another tab is selected. */
  public readonly qualityIssuesSection: Locator;
  public readonly stacktraceSection: Locator;

  /**
   * Accordion toggles, which carry the open state on `aria-expanded`. Matched by accessible name
   * rather than by position so the locator does not depend on EUI's button order inside the
   * accordion, where the collapse arrow is itself a button.
   */
  public readonly qualityIssuesAccordion: Locator;
  public readonly stacktraceAccordion: Locator;

  /** Header of the row colour indicator column; absent when the profile does not resolve. */
  public readonly colorIndicatorHeader: Locator;

  /**
   * Page-wide matches for the profile's cell renderers. Use these for absence assertions, where
   * scoping to a row would pass for the wrong reason if the row itself failed to render.
   */
  public readonly logLevelBadges: Locator;
  public readonly serviceNameCells: Locator;
  public readonly summaryMessageValues: Locator;

  constructor(
    private readonly page: ScoutPage,
    private readonly dataGrid: PageObjects['dataGrid'],
    private readonly discover: PageObjects['discover'],
    private readonly appMenu: PageObjects['appMenu']
  ) {
    this.logsOverviewHeader = page.testSubj.locator(LOGS.LOGS_OVERVIEW_HEADER);
    this.sampleSizeFooter = page.testSubj.locator(SAMPLE_SIZE_FOOTER);
    this.loadMoreLink = page.testSubj.locator(LOAD_MORE_LINK);
    this.alertsMenuButton = page.testSubj.locator(ALERTS_MENU_BUTTON);
    this.ruleTypeName = page.testSubj.locator(RULE_TYPE_NAME);
    this.createSloFlyoutTitle = page.testSubj.locator(CREATE_SLO_FLYOUT_TITLE);
    this.qualityIssuesSection = page.testSubj.locator(QUALITY_ISSUES_ACCORDION);
    this.stacktraceSection = page.testSubj.locator(STACKTRACE_ACCORDION);
    this.qualityIssuesAccordion = this.qualityIssuesSection.getByRole('button', {
      name: /quality issues/i,
    });
    this.stacktraceAccordion = this.stacktraceSection.getByRole('button', { name: /stacktrace/i });
    this.colorIndicatorHeader = page.testSubj.locator(
      `dataGridHeaderCell-${COLOR_INDICATOR_COLUMN_ID}`
    );
    this.logLevelBadges = page.locator(`[data-test-subj^="${LOG_LEVEL_BADGE_PREFIX}"]`);
    this.serviceNameCells = page.testSubj.locator(SERVICE_NAME_CELL);
    this.summaryMessageValues = page.testSubj.locator(SUMMARY_MESSAGE_VALUE);
  }

  /** Colour indicator of a single row. Carries the log level as its `title`. */
  public rowColorIndicator(rowIndex: number): Locator {
    return this.dataGrid
      .getCell(rowIndex, COLOR_INDICATOR_COLUMN_ID)
      .locator(`[data-test-subj="${ROW_COLOR_INDICATOR}"]`);
  }

  /** Log-level badge rendered inside a row's `log.level` cell. */
  public logLevelBadge(rowIndex: number, logLevel: string): Locator {
    return this.dataGrid
      .getCell(rowIndex, LOGS.LOG_LEVEL_FIELD)
      .locator(`[data-test-subj="${LOG_LEVEL_BADGE_PREFIX}${logLevel}"]`);
  }

  /** Service-name cell renderer inside a row's `service.name` cell. */
  public serviceNameCell(rowIndex: number): Locator {
    return this.dataGrid
      .getCell(rowIndex, LOGS.SERVICE_NAME_FIELD)
      .locator(`[data-test-subj="${SERVICE_NAME_CELL}"]`);
  }

  public qualityIssueControl(rowIndex: number): Locator {
    return this.dataGrid.getRowLeadingControl(rowIndex, QUALITY_ISSUE_CONTROL);
  }

  public stacktraceControl(rowIndex: number): Locator {
    return this.dataGrid.getRowLeadingControl(rowIndex, STACKTRACE_CONTROL);
  }

  public async clickQualityIssueControl(rowIndex: number) {
    await this.clickRowLeadingControl(this.qualityIssueControl(rowIndex));
  }

  public async clickStacktraceControl(rowIndex: number) {
    await this.clickRowLeadingControl(this.stacktraceControl(rowIndex));
  }

  /**
   * Shows the seeded doc-viewer logs. Every seeded document carries both a stack trace and a quality
   * issue, so no query is needed and any row index is interchangeable with any other.
   */
  public async gotoDocViewerLogs() {
    await this.gotoDataView(LOGS.SYNTH_DOCVIEWER_DATA_VIEW);
  }

  /** Shows the given data view in Discover once its grid has rendered. */
  public async gotoDataView(dataView: string) {
    await this.discover.goto({ queryMode: 'classic' });
    await this.discover.selectDataView(dataView);
    await this.discover.waitUntilTabIsLoaded();
    await this.dataGrid.waitForDocTableRendered();
  }

  /** Runs the given ES|QL query in Discover once its grid has rendered. */
  public async gotoEsqlQuery(query: string) {
    await this.discover.goto({ queryMode: 'esql' });
    await this.discover.writeAndSubmitEsqlQuery(query);
    await this.discover.waitUntilTabIsLoaded();
    await this.dataGrid.waitForDocTableRendered();
  }

  /**
   * Scrolls the virtualized grid to its last row with the grid's Ctrl+End shortcut. The logs profile
   * paginates in `singlePage` mode, where the footer only renders once the bottom has been reached.
   * Auto-height rows grow the scroll height as they render, so the shortcut is repeated until the
   * last row stays in view.
   */
  public async scrollGridToBottom() {
    const grid = this.page.testSubj.locator(DOC_TABLE).getByRole('grid');

    await expect(async () => {
      const rowCount = Number(await grid.getAttribute('aria-rowcount'));
      // The shortcut is only handled while a cell has focus; the sticky header is always mounted.
      await this.colorIndicatorHeader.focus();
      await this.page.keyboard.press('Control+End');
      // The whole row, not one cell: Ctrl+End also scrolls horizontally to the last column.
      await expect(
        grid.locator(`[data-grid-visible-row-index="${rowCount - 1}"]`)
      ).toBeInViewport();
    }).toPass();
  }

  /** Fetches the next sample from the `singlePage` footer, which must already be in view. */
  public async loadMore() {
    await this.loadMoreLink.click();
    // The grid grows past the viewport, hiding the footer until the new bottom is reached.
    await expect(this.sampleSizeFooter).toBeHidden();
  }

  /** Waits for the Single document page to render its document. */
  public async waitForSingleDocument() {
    await this.page.testSubj.locator(SINGLE_DOCUMENT).waitFor({ state: 'visible' });
  }

  /** Opens the Alerts app menu and clicks one of its items. */
  public async clickAlertsMenuItem(itemTestSubj: string) {
    await this.discover.clickAppMenuItem(ALERTS_MENU_BUTTON);
    await this.page.testSubj.locator(itemTestSubj).click();
  }

  /**
   * Mounts every app menu item. Items collapse into the overflow popover on narrow viewports and are
   * not rendered until it opens, so an absence check is only meaningful once it has been opened.
   */
  public async revealAllAppMenuItems() {
    // A menu item every role has, so the menu is known to have finished rendering.
    await this.appMenu.revealItem('discoverNewButton');
    if (await this.appMenu.overflowButton.isVisible()) {
      await this.appMenu.openOverflow();
    }
  }

  /**
   * Opens the doc viewer for the anchor row of the Surrounding documents page. Its expand button
   * carries its own test subject, so `dataGrid.openDocumentDetails` does not match it.
   */
  public async openAnchorDocumentDetails() {
    const expandButton = this.page.testSubj.locator(ANCHOR_EXPAND_BUTTON);
    await expandButton.hover();
    await expandButton.click();
  }

  /** Hovers first: row leading controls are only revealed once the row is hovered. */
  private async clickRowLeadingControl(control: Locator) {
    await control.hover();
    await control.click();
  }
}
