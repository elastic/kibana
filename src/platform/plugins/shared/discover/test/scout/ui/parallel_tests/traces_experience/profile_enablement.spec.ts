/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import {
  spaceTest,
  TRACES,
  setupTracesExperience,
  teardownTracesExperience,
} from '../../fixtures/traces_experience';

spaceTest.describe(
  'Traces in Discover - Profile enablement',
  {
    tag: [...tags.stateful.all, ...tags.serverless.observability.complete],
  },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace, config }) => {
      await setupTracesExperience(scoutSpace, config);
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsViewer();
      await pageObjects.discover.goto();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await teardownTracesExperience(scoutSpace);
    });

    spaceTest(
      'should load Discover with trace data in classic mode',
      async ({ page, pageObjects }) => {
        await spaceTest.step('verify Discover loaded with results', async () => {
          await pageObjects.discover.waitForDocTableRendered();
          await expect(page.testSubj.locator('discoverDocTable')).toBeVisible();
        });
      }
    );

    spaceTest(
      'should load Discover with trace data in ESQL mode',
      async ({ page, pageObjects }) => {
        await spaceTest.step('run ESQL query for traces', async () => {
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
