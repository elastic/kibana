/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { lighthouseTest, tags } from '@kbn/scout';
import { testData } from '../fixtures';

lighthouseTest.describe(
  'Discover App - Lighthouse Performance Audit',
  { tag: [...tags.deploymentAgnostic, ...tags.performance] },
  () => {
    lighthouseTest.beforeAll(async ({ esArchiver, kbnClient, uiSettings }) => {
      await esArchiver.loadIfNeeded(testData.ES_ARCHIVES.LOGSTASH);
      await kbnClient.importExport.load(testData.KBN_ARCHIVES.DASHBOARD_DRILLDOWNS);
      await uiSettings.set({
        defaultIndex: testData.DATA_VIEW_ID.LOGSTASH,
        'timepicker:timeDefaults': JSON.stringify(testData.DEFAULT_TIME_RANGE),
      });
    });

    lighthouseTest.afterAll(async ({ kbnClient, uiSettings }) => {
      await uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
      await kbnClient.savedObjects.cleanStandardList();
    });

    lighthouseTest(
      'runs audit on Discover Page',
      async ({ browserAuth, lighthouse, page, pageObjects }) => {
        await browserAuth.loginAsAdmin();
        await pageObjects.discover.goto({ queryMode: 'classic' });
        await pageObjects.discover.waitForHistogramRendered();
        const currentUrl = page.url();

        // Run the Lighthouse audit on the current page and attach the report
        await lighthouse.runAudit(currentUrl);
      }
    );
  }
);
