/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import moment from 'moment/moment';
import { log, timerange } from '@kbn/synthtrace-client';
import type { LogsSynthtraceEsClient } from '@kbn/synthtrace';
import type { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'discover', 'unifiedFieldList', 'timePicker']);
  const testSubjects = getService('testSubjects');
  const dataViews = getService('dataViews');
  const synthtrace = getService('synthtrace');
  const dataGrid = getService('dataGrid');
  const monacoEditor = getService('monacoEditor');

  const start = moment().subtract(30, 'minutes').valueOf();
  const end = moment().add(30, 'minutes').valueOf();

  describe('Summary column', () => {
    let synthEsLogsClient: LogsSynthtraceEsClient;

    before(async () => {
      const { logsEsClient } = synthtrace.getClients(['logsEsClient']);
      synthEsLogsClient = logsEsClient;

      // Index logs data with specific numeric field values for testing formatting
      await synthEsLogsClient.index([
        timerange(start, end)
          .interval('1m')
          .rate(1)
          .generator((timestamp: number, index: number) =>
            log
              .create()
              .message(`Test log message ${index}`)
              .timestamp(timestamp)
              .dataset('synth.formatting')
              .namespace('default')
              .logLevel('info')
              .defaults({
                'service.name': 'synth-service',
                'host.name': 'synth-host',
                'event.dataset': 'synth.formatting',
                'log.level': 'info',
              })
          ),
      ]);
    });

    after(async () => {
      await synthEsLogsClient.clean();
    });

    beforeEach(async () => {
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.discover.waitUntilTabIsLoaded();
    });

    describe('ES|QL mode', () => {
      it('should show Summary column in logs profile', async () => {
        await PageObjects.discover.selectTextBaseLang();
        await PageObjects.discover.waitUntilTabIsLoaded();

        const testQuery = 'FROM logs-* | SORT @timestamp DESC | LIMIT 1';
        await monacoEditor.setCodeEditorValue(testQuery);
        await testSubjects.click('querySubmitButton');
        await PageObjects.discover.waitUntilTabIsLoaded();

        const summaryCell = await dataGrid.getCellElementExcludingControlColumns(0, 1);
        const summaryValue = await summaryCell.getVisibleText();
        expect(summaryValue).to.contain('synth-service\nsynth-host\nTest log message');
      });

      it('should correctly format ES|QL computed columns in Summary column without message field', async () => {
        // Switch to ES|QL mode
        await PageObjects.discover.selectTextBaseLang();
        await PageObjects.discover.waitUntilTabIsLoaded();

        // Query with EVAL to create computed columns
        // This tests that columnsMeta is properly used for formatting
        const testQuery =
          'FROM logs-* | SORT @timestamp DESC | LIMIT 1 | eval custom_bytes = network.bytes * 2 | drop message';
        await monacoEditor.setCodeEditorValue(testQuery);
        await testSubjects.click('querySubmitButton');
        await PageObjects.discover.waitUntilTabIsLoaded();

        // 1. Verify the computed column value in the data grid
        const summaryCell = await dataGrid.getCellElementExcludingControlColumns(0, 1);
        const summaryValue = await summaryCell.getVisibleText();
        expect(summaryValue).to.match(/custom_bytes\d{1,3},\d{3}/);

        // 2. Add custom_bytes as a separate column and verify the same value
        await PageObjects.unifiedFieldList.clickFieldListItemAdd('custom_bytes');
        await PageObjects.discover.waitUntilTabIsLoaded();
        const columnCell = await dataGrid.getCellElementExcludingControlColumns(0, 0);
        const columnValue = await columnCell.getVisibleText();
        expect(columnValue).to.match(/^\d{1,3},\d{3}$/);

        expect(summaryValue).to.contain(columnValue);
      });
    });

    describe('data view mode', () => {
      it('should show Summary column in logs profile', async () => {
        await dataViews.switchToAndValidate('All logs');

        // Verify the Summary column is present (logs profile default)
        const columns = await PageObjects.discover.getColumnHeaders();
        expect(columns).to.contain('Summary');

        // Verify the Summary column shows formatted content
        const summaryCell = await dataGrid.getCellElementExcludingControlColumns(0, 1);
        const summaryValue = await summaryCell.getVisibleText();
        // Summary should contain the message content
        expect(summaryValue).to.contain('synth-service\nsynth-host\nTest log message');
      });
    });
  });
}
