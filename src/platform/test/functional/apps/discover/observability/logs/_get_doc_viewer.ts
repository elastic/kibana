/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment/moment';
import { log, timerange } from '@kbn/apm-synthtrace-client';
import expect from '@kbn/expect';
import { LogsSynthtraceEsClient } from '@kbn/apm-synthtrace';
import { FtrProviderContext } from '../../ftr_provider_context';
import { MORE_THAN_1024_CHARS, STACKTRACE_MESSAGE } from '../const';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'discover']);
  const testSubjects = getService('testSubjects');
  const dataGrid = getService('dataGrid');
  const dataViews = getService('dataViews');
  const synthtrace = getService('synthtrace');
  const queryBar = getService('queryBar');

  const start = moment().subtract(30, 'minutes').valueOf();
  const end = moment().add(30, 'minutes').valueOf();

  describe('extension getDocViewer ', () => {
    let synthEsLogsClient: LogsSynthtraceEsClient;
    before(async () => {
      const { logsEsClient } = synthtrace.getClients(['logsEsClient']);

      synthEsLogsClient = logsEsClient;

      synthEsLogsClient.index([
        timerange(start, end)
          .interval('1m')
          .rate(5)
          .generator((timestamp: number, index: number) =>
            log
              .create()
              .message('This is a log message')
              .timestamp(timestamp)
              .dataset('synth.discover')
              .namespace('default')
              .logLevel(index % 2 === 0 ? MORE_THAN_1024_CHARS : 'This is a log message')
              .defaults({
                'service.name': 'synth-discover',
                ...(index % 2 === 0 && { 'error.stack_trace': STACKTRACE_MESSAGE }),
              })
          ),
      ]);

      await PageObjects.common.navigateToActualUrl('discover', undefined, {
        ensureCurrentUrl: false,
      });

      // Required as some other test switches data view to metric-*
      await dataViews.switchTo('All logs');

      await queryBar.setQuery('error.stack_trace : * and _ignored : *');
      await queryBar.submitQuery();
      await PageObjects.discover.waitUntilSearchingHasFinished();
    });

    after(async () => {
      await synthEsLogsClient.clean();
    });

    afterEach(async () => {
      await dataGrid.closeFlyout();
    });

    describe('renders docViewer', () => {
      it('should open the flyout with stacktrace and quality issues accordion closed when expand is clicked', async () => {
        await dataGrid.clickRowToggle({ rowIndex: 0 });

        // Ensure Log overview flyout is open
        const tabButton = await testSubjects.find('docViewerTab-doc_view_logs_overview');
        await tabButton.click();

        // Quality Issues accordion to be present and collapsed
        await testSubjects.existOrFail('unifiedDocViewLogsOverviewDegradedFieldsAccordion');

        const isQualityIssuesAccordionExpanded = await testSubjects.getAccordionState(
          'unifiedDocViewLogsOverviewDegradedFieldsAccordion'
        );

        expect(isQualityIssuesAccordionExpanded).to.equal('false');

        // Stacktrace accordion to be present and collapsed
        await testSubjects.existOrFail('unifiedDocViewLogsOverviewStacktraceAccordion');

        const isStacktraceAccordionExpanded = await testSubjects.getAccordionState(
          'unifiedDocViewLogsOverviewStacktraceAccordion'
        );

        expect(isStacktraceAccordionExpanded).to.equal('false');
      });

      it('should open the flyout with stacktrace accordion open and quality issues accordion closed when stacktrace icon is clicked', async () => {
        await dataGrid.clickStacktraceLeadingControl(0);

        // Ensure Log overview flyout is open
        await testSubjects.existOrFail('docViewerTab-doc_view_logs_overview');

        // Quality Issues accordion to be present and collapsed
        await testSubjects.existOrFail('unifiedDocViewLogsOverviewDegradedFieldsAccordion');

        const isQualityIssuesAccordionExpanded = await testSubjects.getAccordionState(
          'unifiedDocViewLogsOverviewDegradedFieldsAccordion'
        );

        expect(isQualityIssuesAccordionExpanded).to.equal('false');

        // Stacktrace accordion to be present and collapsed
        await testSubjects.existOrFail('unifiedDocViewLogsOverviewStacktraceAccordion');

        const isStacktraceAccordionExpanded = await testSubjects.getAccordionState(
          'unifiedDocViewLogsOverviewStacktraceAccordion'
        );

        expect(isStacktraceAccordionExpanded).to.equal('true');
      });

      it('should open the flyout with stacktrace accordion closed and quality issues accordion open when quality issues icon is clicked', async () => {
        await dataGrid.clickQualityIssueLeadingControl(0);

        // Ensure Log overview flyout is open
        await testSubjects.existOrFail('docViewerTab-doc_view_logs_overview');

        // Quality Issues accordion to be present and collapsed
        await testSubjects.existOrFail('unifiedDocViewLogsOverviewDegradedFieldsAccordion');

        const isQualityIssuesAccordionExpanded = await testSubjects.getAccordionState(
          'unifiedDocViewLogsOverviewDegradedFieldsAccordion'
        );

        expect(isQualityIssuesAccordionExpanded).to.equal('true');

        // Stacktrace accordion to be present and collapsed
        await testSubjects.existOrFail('unifiedDocViewLogsOverviewStacktraceAccordion');

        const isStacktraceAccordionExpanded = await testSubjects.getAccordionState(
          'unifiedDocViewLogsOverviewStacktraceAccordion'
        );

        expect(isStacktraceAccordionExpanded).to.equal('false');
      });

      it('should keep old accordion open when 1st stacktrace and then quality issue control for the same row is clicked', async () => {
        await dataGrid.clickStacktraceLeadingControl(0);

        const stacktraceAccordionState = await testSubjects.getAccordionState(
          'unifiedDocViewLogsOverviewStacktraceAccordion'
        );

        const qualityIssuesAccordionState = await testSubjects.getAccordionState(
          'unifiedDocViewLogsOverviewDegradedFieldsAccordion'
        );

        // 1st stack trace accordion should be opened and quality issues should be closed
        expect(stacktraceAccordionState).to.equal('true');
        expect(qualityIssuesAccordionState).to.equal('false');

        // Clicking on Quality Issue control of the same row while the Flyout is still open

        await dataGrid.clickQualityIssueLeadingControl(0);

        const stacktraceAccordionState2 = await testSubjects.getAccordionState(
          'unifiedDocViewLogsOverviewStacktraceAccordion'
        );

        const qualityIssuesAccordionState2 = await testSubjects.getAccordionState(
          'unifiedDocViewLogsOverviewDegradedFieldsAccordion'
        );

        // Expect the previous one to stay open and new one to also open. This shows component did not remount
        expect(stacktraceAccordionState2).to.equal('true');
        expect(qualityIssuesAccordionState2).to.equal('true');
      });

      it('should toggle to quality issue accordion when 1st stacktrace and then quality issue control is clicked for different row', async () => {
        await dataGrid.clickStacktraceLeadingControl(0);

        const stacktraceAccordionState = await testSubjects.getAccordionState(
          'unifiedDocViewLogsOverviewStacktraceAccordion'
        );

        const qualityIssuesAccordionState = await testSubjects.getAccordionState(
          'unifiedDocViewLogsOverviewDegradedFieldsAccordion'
        );

        // 1st stack trace accordion should be opened and quality issues should be closed
        expect(stacktraceAccordionState).to.equal('true');
        expect(qualityIssuesAccordionState).to.equal('false');

        // Clicking on Quality Issue control of the same row while the Flyout is still open

        await dataGrid.clickQualityIssueLeadingControl(1);

        const stacktraceAccordionState2 = await testSubjects.getAccordionState(
          'unifiedDocViewLogsOverviewStacktraceAccordion'
        );

        const qualityIssuesAccordionState2 = await testSubjects.getAccordionState(
          'unifiedDocViewLogsOverviewDegradedFieldsAccordion'
        );

        // Expect toggle to have happened
        expect(stacktraceAccordionState2).to.equal('false');
        expect(qualityIssuesAccordionState2).to.equal('true');
      });

      it('should keep old accordion open when 1st quality issue and then stacktrace control for the same row is clicked', async () => {
        await dataGrid.clickQualityIssueLeadingControl(0);

        const stacktraceAccordionState = await testSubjects.getAccordionState(
          'unifiedDocViewLogsOverviewStacktraceAccordion'
        );

        const qualityIssuesAccordionState = await testSubjects.getAccordionState(
          'unifiedDocViewLogsOverviewDegradedFieldsAccordion'
        );

        // 1st quality issues accordion should be opened and stacktrace should be closed
        expect(stacktraceAccordionState).to.equal('false');
        expect(qualityIssuesAccordionState).to.equal('true');

        // Clicking on Stacktrace control of the same row while the Flyout is still open
        await dataGrid.clickStacktraceLeadingControl(0);

        const stacktraceAccordionState2 = await testSubjects.getAccordionState(
          'unifiedDocViewLogsOverviewStacktraceAccordion'
        );

        const qualityIssuesAccordionState2 = await testSubjects.getAccordionState(
          'unifiedDocViewLogsOverviewDegradedFieldsAccordion'
        );

        // Expect the previous one to stay open and new one to also open. This shows component did not remount
        expect(stacktraceAccordionState2).to.equal('true');
        expect(qualityIssuesAccordionState2).to.equal('true');
      });

      it('should toggle to stacktrace accordion when 1st quality issue and then stacktrace control is clicked for different row', async () => {
        await dataGrid.clickQualityIssueLeadingControl(0);

        const stacktraceAccordionState = await testSubjects.getAccordionState(
          'unifiedDocViewLogsOverviewStacktraceAccordion'
        );

        const qualityIssuesAccordionState = await testSubjects.getAccordionState(
          'unifiedDocViewLogsOverviewDegradedFieldsAccordion'
        );

        // 1st quality issues accordion should be opened and stacktrace should be closed
        expect(stacktraceAccordionState).to.equal('false');
        expect(qualityIssuesAccordionState).to.equal('true');

        // Clicking on Stacktrace control of the same row while the Flyout is still open
        await dataGrid.clickStacktraceLeadingControl(1);

        const stacktraceAccordionState2 = await testSubjects.getAccordionState(
          'unifiedDocViewLogsOverviewStacktraceAccordion'
        );

        const qualityIssuesAccordionState2 = await testSubjects.getAccordionState(
          'unifiedDocViewLogsOverviewDegradedFieldsAccordion'
        );

        // Expect toggle to have happened
        expect(stacktraceAccordionState2).to.equal('true');
        expect(qualityIssuesAccordionState2).to.equal('false');
      });

      it('should switch tab to logs overview and open quality issues accordion, when user clicks on quality issue control of same row and flyout is already open with some other tab', async () => {
        await dataGrid.clickRowToggle({ rowIndex: 0 });

        // Switch to JSON tab
        const jsonTabButton = await testSubjects.find('docViewerTab-doc_view_source');
        await jsonTabButton.click();

        // Click to open Quality Issue control on the same row
        await dataGrid.clickQualityIssueLeadingControl(0);

        const qualityIssuesAccordionState = await testSubjects.getAccordionState(
          'unifiedDocViewLogsOverviewDegradedFieldsAccordion'
        );
        const stacktraceAccordionState = await testSubjects.getAccordionState(
          'unifiedDocViewLogsOverviewStacktraceAccordion'
        );

        expect(qualityIssuesAccordionState).to.equal('true');
        expect(stacktraceAccordionState).to.equal('false');
      });

      it('should switch tab to logs overview and open quality issues accordion, when user clicks on quality issue control of different row and flyout is already open with some other tab', async () => {
        await dataGrid.clickRowToggle({ rowIndex: 0 });

        // Switch to JSON tab
        const jsonTabButton = await testSubjects.find('docViewerTab-doc_view_source');
        await jsonTabButton.click();

        // Click to open Quality Issue control on the same row
        await dataGrid.clickQualityIssueLeadingControl(1);

        const qualityIssuesAccordionState = await testSubjects.getAccordionState(
          'unifiedDocViewLogsOverviewDegradedFieldsAccordion'
        );
        const stacktraceAccordionState = await testSubjects.getAccordionState(
          'unifiedDocViewLogsOverviewStacktraceAccordion'
        );

        expect(qualityIssuesAccordionState).to.equal('true');
        expect(stacktraceAccordionState).to.equal('false');
      });

      it('should switch tab to logs overview and open stacktrace accordion, when user clicks on stacktrace control of same row and flyout is already open with some other tab', async () => {
        await dataGrid.clickRowToggle({ rowIndex: 0 });

        // Switch to JSON tab
        const jsonTabButton = await testSubjects.find('docViewerTab-doc_view_source');
        await jsonTabButton.click();

        // Click to open Quality Issue control on the same row
        await dataGrid.clickStacktraceLeadingControl(0);

        const qualityIssuesAccordionState = await testSubjects.getAccordionState(
          'unifiedDocViewLogsOverviewDegradedFieldsAccordion'
        );
        const stacktraceAccordionState = await testSubjects.getAccordionState(
          'unifiedDocViewLogsOverviewStacktraceAccordion'
        );

        expect(qualityIssuesAccordionState).to.equal('false');
        expect(stacktraceAccordionState).to.equal('true');
      });

      it('should switch tab to logs overview and open stacktrace accordion, when user clicks on stacktrace control of different row and flyout is already open with some other tab', async () => {
        await dataGrid.clickRowToggle({ rowIndex: 0 });

        // Switch to JSON tab
        const jsonTabButton = await testSubjects.find('docViewerTab-doc_view_source');
        await jsonTabButton.click();

        // Click to open Quality Issue control on the same row
        await dataGrid.clickStacktraceLeadingControl(1);

        const qualityIssuesAccordionState = await testSubjects.getAccordionState(
          'unifiedDocViewLogsOverviewDegradedFieldsAccordion'
        );
        const stacktraceAccordionState = await testSubjects.getAccordionState(
          'unifiedDocViewLogsOverviewStacktraceAccordion'
        );

        expect(qualityIssuesAccordionState).to.equal('false');
        expect(stacktraceAccordionState).to.equal('true');
      });
    });
  });
}
