/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Locator, PageObjects, ScoutPage } from '@kbn/scout';
import { LOGS } from '../constants';

/** Leading controls the logs data source profile contributes to each data-grid row. */
const QUALITY_ISSUE_CONTROL = 'docTableDegradedDocExist';
const STACKTRACE_CONTROL = 'docTableStacktraceExist';

/** Log overview sections in the doc viewer flyout. */
const QUALITY_ISSUES_ACCORDION = 'unifiedDocViewLogsOverviewDegradedFieldsAccordion';
const STACKTRACE_ACCORDION = 'unifiedDocViewLogsOverviewStacktraceAccordion';

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

  constructor(
    page: ScoutPage,
    private readonly dataGrid: PageObjects['dataGrid'],
    private readonly discover: PageObjects['discover']
  ) {
    this.qualityIssuesSection = page.testSubj.locator(QUALITY_ISSUES_ACCORDION);
    this.stacktraceSection = page.testSubj.locator(STACKTRACE_ACCORDION);
    this.qualityIssuesAccordion = this.qualityIssuesSection.getByRole('button', {
      name: /quality issues/i,
    });
    this.stacktraceAccordion = this.stacktraceSection.getByRole('button', { name: /stacktrace/i });
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
    await this.discover.goto({ queryMode: 'classic' });
    await this.discover.selectDataView(LOGS.SYNTH_DOCVIEWER_DATA_VIEW);
    await this.discover.waitUntilTabIsLoaded();
    await this.dataGrid.waitForDocTableRendered();
  }

  /** Hovers first: row leading controls are only revealed once the row is hovered. */
  private async clickRowLeadingControl(control: Locator) {
    await control.hover();
    await control.click();
  }
}
