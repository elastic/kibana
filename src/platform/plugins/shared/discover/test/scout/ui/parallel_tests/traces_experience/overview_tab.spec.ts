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
  setupTracesExperience,
  teardownTracesExperience,
} from '../../fixtures/traces_experience';

spaceTest.describe(
  'Traces in Discover - Overview tab',
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

    spaceTest('should show Overview tab in the document flyout', async ({ pageObjects }) => {
      await spaceTest.step('open first document in flyout', async () => {
        await pageObjects.tracesExperience.openDocumentFlyout(pageObjects.discover);
      });

      await spaceTest.step('verify Overview tab is present', async () => {
        await expect(pageObjects.tracesExperience.flyout.overviewTab).toBeVisible();
      });
    });

    spaceTest('should render the Similar Spans section', async ({ pageObjects }) => {
      await spaceTest.step('open Overview tab', async () => {
        await pageObjects.tracesExperience.openOverviewTab(pageObjects.discover);
      });

      await spaceTest.step('verify Similar Spans section is visible', async () => {
        await expect(pageObjects.tracesExperience.flyout.similarSpansSection).toBeVisible();
      });
    });

    spaceTest('should render the Trace Summary section', async ({ pageObjects }) => {
      await spaceTest.step('open Overview tab', async () => {
        await pageObjects.tracesExperience.openOverviewTab(pageObjects.discover);
      });

      await spaceTest.step('verify Trace Summary section is visible', async () => {
        await expect(pageObjects.tracesExperience.flyout.traceSummarySection).toBeVisible();
      });
    });

    spaceTest('should render the Logs section', async ({ pageObjects }) => {
      await spaceTest.step('open Overview tab', async () => {
        await pageObjects.tracesExperience.openOverviewTab(pageObjects.discover);
      });

      await spaceTest.step('verify Logs section is visible', async () => {
        await expect(pageObjects.tracesExperience.flyout.logsSection).toBeVisible();
      });
    });
  }
);
