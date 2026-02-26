/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { spaceTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { TRACES } from '../../fixtures/traces_experience';

spaceTest.describe(
  'Traces in Discover - Profile enablement',
  {
    tag: [...tags.stateful.all, ...tags.serverless.observability.complete],
  },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace, config }) => {
      if (!config.serverless) {
        await scoutSpace.setSolutionView('oblt');
      }
      await scoutSpace.savedObjects.load(TRACES.KBN_ARCHIVE);
      await scoutSpace.uiSettings.setDefaultIndex(TRACES.DATA_VIEW_NAME);
      await scoutSpace.uiSettings.setDefaultTime({
        from: TRACES.DEFAULT_START_TIME,
        to: TRACES.DEFAULT_END_TIME,
      });
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsViewer();
      await pageObjects.discover.goto();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest(
      'should load Discover with trace data in Classic mode',
      async ({ page, pageObjects }) => {
        await spaceTest.step('verify Discover loaded with results', async () => {
          await pageObjects.discover.waitForDocTableRendered();
          await expect(page.testSubj.locator('discoverDocTable')).toBeVisible();
        });
      }
    );

    spaceTest(
      'should load Discover with trace data in ES|QL mode',
      async ({ page, pageObjects }) => {
        await spaceTest.step('run ES|QL query for traces', async () => {
          await pageObjects.discover.writeEsqlQuery(TRACES.ESQL_QUERY);
        });

        await spaceTest.step('verify Discover loaded with results', async () => {
          await pageObjects.discover.waitForDocTableRendered();
          await expect(page.testSubj.locator('discoverDocTable')).toBeVisible();
        });
      }
    );
  }
);
