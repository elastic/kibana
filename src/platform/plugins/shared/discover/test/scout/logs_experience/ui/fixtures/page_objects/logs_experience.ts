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

export class LogsExperiencePage {
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
    private readonly discover: PageObjects['discover']
  ) {
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
   * Scrolls the virtualized grid to its last row. The logs profile paginates in `singlePage` mode,
   * where the footer only renders once the bottom has been reached. Auto-height rows are measured
   * as they render, which grows the scroll height, so a single scroll can land short of the end.
   * The scroll container exposes no test subject, so its EUI class is the only handle.
   */
  public async scrollGridToBottom() {
    const scrollContainer = this.page.testSubj
      .locator('discoverDocTable')
      .locator('.euiDataGrid__virtualized');

    await expect(async () => {
      await scrollContainer.evaluate((element) => element.scrollTo(0, element.scrollHeight));
      const isAtBottom = await scrollContainer.evaluate(
        (element) =>
          new Promise<boolean>((resolve) =>
            requestAnimationFrame(() =>
              resolve(element.scrollTop + element.clientHeight >= element.scrollHeight - 1)
            )
          )
      );
      expect(isAtBottom).toBe(true);
    }).toPass();
  }

  /**
   * Opens the doc viewer for the anchor row of the Surrounding documents page. Its expand button
   * carries its own test subject, so `dataGrid.openDocumentDetails` does not match it.
   */
  public async openAnchorDocumentDetails() {
    const expandButton = this.page.testSubj.locator('docTableExpandToggleColumnAnchor');
    await expandButton.hover();
    await expandButton.click();
  }

  /** Hovers first: row leading controls are only revealed once the row is hovered. */
  private async clickRowLeadingControl(control: Locator) {
    await control.hover();
    await control.click();
  }
}
